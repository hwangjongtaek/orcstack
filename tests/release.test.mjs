// tools/release.mjs (M5-2): prepare a release from CHANGELOG [Unreleased], and print a version's notes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const PIN = JSON.parse(readFileSync(join(REPO, "sync", "upstream.json"), "utf8")).pin;

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

upstream: pstack 0.0.1 (\`0000000\`)

### Added

- new thing

## [0.0.1] - 2026-01-01

upstream: pstack 0.0.1 (\`0000000\`)

### Added

- old thing
`;

function setup({ changelog = CHANGELOG, version = "0.0.1" } = {}) {
  const root = mkdtempSync(join(tmpdir(), "orcstack-release-"));
  for (const path of ["sync", "harness"]) cpSync(join(REPO, path), join(root, path), { recursive: true });
  mkdirSync(join(root, "src", "skills", "x"), { recursive: true });
  writeFileSync(join(root, "src", "skills", "x", "SKILL.md"), "---\nname: x\ndescription: d\n---\nx\n");
  writeFileSync(join(root, "VERSION"), `${version}\n`);
  writeFileSync(join(root, "package.json"), `${JSON.stringify({ name: "orcstack", version, private: true }, null, 2)}\n`);
  writeFileSync(join(root, "CHANGELOG.md"), changelog);
  const run = (tool, ...args) => spawnSync(process.execPath, [join(REPO, "tools", tool), ...args, "--root", root], { encoding: "utf8" });
  assert.equal(run("build.mjs").status, 0);
  return { root, run, read: (path) => readFileSync(join(root, path), "utf8") };
}

test("prepare bumps the version everywhere and moves [Unreleased] into a dated section with the pinned upstream", () => {
  const { run, read } = setup();
  const result = run("release.mjs", "prepare", "--version", "0.1.0", "--date", "2026-11-06");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(read("VERSION"), "0.1.0\n");
  assert.equal(JSON.parse(read("package.json")).version, "0.1.0");
  assert.equal(JSON.parse(read("dist/claude-code/.claude-plugin/plugin.json")).version, "0.1.0");
  assert.equal(run("build.mjs", "--check").status, 0, "dist/ matches a fresh build");
  const log = read("CHANGELOG.md");
  assert.match(log, /## \[Unreleased\]\n\n## \[0\.1\.0\] - 2026-11-06\n\n/);
  assert.ok(log.includes(`## [0.1.0] - 2026-11-06\n\nupstream: pstack ${PIN.version} (\`${PIN.commit.slice(0, 7)}\`)\n\n### Added\n\n- new thing\n`), log);
  assert.match(log, /## \[0\.0\.1\] - 2026-01-01\n\nupstream: pstack 0\.0\.1/, "older sections stay as they were");
});

test("prepare refuses a version that does not move forward, and an empty [Unreleased]", () => {
  const { run, read } = setup();
  for (const version of ["0.0.1", "0.0.0", "1.0"]) {
    const result = run("release.mjs", "prepare", "--version", version);
    assert.notEqual(result.status, 0, version);
    assert.equal(read("VERSION"), "0.0.1\n");
  }
  const empty = setup({ changelog: CHANGELOG.replace("upstream: pstack 0.0.1 (`0000000`)\n\n### Added\n\n- new thing\n\n", "") });
  const result = empty.run("release.mjs", "prepare", "--version", "0.1.0");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unreleased/);
  assert.equal(empty.read("VERSION"), "0.0.1\n");
});

test("notes prints only the body of one version's section", () => {
  const { run } = setup();
  const result = run("release.mjs", "notes", "--version", "0.0.1");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "upstream: pstack 0.0.1 (`0000000`)\n\n### Added\n\n- old thing\n");
  assert.notEqual(run("release.mjs", "notes", "--version", "9.9.9").status, 0);
});
