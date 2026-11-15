import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAttribution, checkFrontmatter, checkLinks } from "../tools/lib/validate.mjs";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const tree = (obj) => new Map(Object.entries(obj).map(([path, body]) => [path, Buffer.from(body)]));

test("broken relative links are reported; external links and anchors are not", () => {
  const files = tree({
    "docs/a.md": "[ok](b.md) [anchor](#x) [web](https://example.com) [ok2](b.md#y) [bad](missing.md)\n[dir](../src/) [placeholder](url)",
    "docs/b.md": "",
    "src/x.md": "",
  });
  assert.deepEqual(checkLinks(files), ["docs/a.md:1: broken link missing.md"]);
});

test("links inside code spans and fenced blocks are ignored", () => {
  const files = tree({ "a.md": "`[x](nope.md)`\n```\n[y](nope.md)\n```\n" });
  assert.deepEqual(checkLinks(files), []);
});

test("SKILL.md frontmatter needs a name matching its folder and a description", () => {
  const files = tree({
    "src/skills/good/SKILL.md": "---\nname: good\ndescription: does good\n---\n# Good",
    "src/skills/bad/SKILL.md": "---\nname: other\n---\n# Bad",
    "src/skills/none/SKILL.md": "# None",
  });
  assert.deepEqual(checkFrontmatter(files), [
    "src/skills/bad/SKILL.md: frontmatter name is \"other\", expected \"bad\"",
    "src/skills/bad/SKILL.md: frontmatter needs a description",
    "src/skills/none/SKILL.md: missing frontmatter",
  ]);
});

test("LICENSE and NOTICE must keep the upstream attribution", () => {
  const pin = "c742dd61706fbacc1b95f1a20b7b988cf096ce6c";
  assert.deepEqual(checkAttribution(tree({ LICENSE: "Copyright (c) 2026 Lauren Tan", "NOTICE.md": `pstack ${pin.slice(0, 7)}` }), pin), []);
  assert.equal(checkAttribution(tree({ LICENSE: "Copyright (c) 2026 orcstack", "NOTICE.md": "" }), pin).length, 2);
});

function scratchRoot() {
  const root = mkdtempSync(join(tmpdir(), "orcstack-validate-"));
  for (const entry of ["sync", "harness", "dist", "docs", "LICENSE", "NOTICE.md", "VERSION", "README.md", "AGENTS.md", "CHANGELOG.md", "assets", "package.json"]) {
    cpSync(join(REPO, entry), join(root, entry), { recursive: true });
  }
  return root;
}
const validate = (root) => spawnSync(process.execPath, [join(REPO, "tools", "validate.mjs"), "--root", root], { encoding: "utf8" });

test("validate passes on this repository", () => {
  const result = spawnSync(process.execPath, [join(REPO, "tools", "validate.mjs")], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("validate fails on denylist residue in src/", () => {
  const root = scratchRoot();
  mkdirSync(join(root, "src", "skills", "x"), { recursive: true });
  writeFileSync(join(root, "src", "skills", "x", "SKILL.md"), "---\nname: x\ndescription: d\n---\nRun it in Cursor.\n");
  spawnSync(process.execPath, [join(REPO, "tools", "build.mjs"), "--root", root]);
  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /denylist.*src\/skills\/x\/SKILL\.md:5.*cursor/);
});

test("validate fails when dist/ is stale", () => {
  const root = scratchRoot();
  writeFileSync(join(root, "VERSION"), "9.9.9\n");
  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /dist\/claude-code\/\.claude-plugin\/plugin\.json/);
});

test("validate fails when package.json and VERSION disagree", () => {
  const root = scratchRoot();
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "orcstack", version: "7.7.7" }));
  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /version: package\.json says 7\.7\.7, VERSION says/);
});

test("validate fails when the CHANGELOG has no section, or no upstream line, for VERSION", () => {
  const root = scratchRoot();
  writeFileSync(join(root, "VERSION"), "5.0.0\n");
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "orcstack", version: "5.0.0" }));
  spawnSync(process.execPath, [join(REPO, "tools", "build.mjs"), "--root", root]);
  writeFileSync(join(root, "CHANGELOG.md"), "# Changelog\n\n## [Unreleased]\n");
  assert.match(validate(root).stdout, /version: CHANGELOG\.md has no "## \[5\.0\.0\]" section/);
  writeFileSync(join(root, "CHANGELOG.md"), "# Changelog\n\n## [Unreleased]\n\n## [5.0.0] - 2026-11-06\n\n### Added\n\n- x\n");
  const result = validate(root);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /version: CHANGELOG\.md \[5\.0\.0\] has no "upstream: pstack <version> \(<commit>\)" line/);
});
