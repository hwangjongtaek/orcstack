// The weekly sync job's decisions (M5-1): no-op, clean sync with a rebuilt dist/, and a conflict as a draft PR.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const TOOL = (name) => join(REPO, "tools", name);

function git(cwd, ...args) {
  return execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" }).trim();
}

function commit(upstream, files, message) {
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(upstream, path)), { recursive: true });
    writeFileSync(join(upstream, path), body);
  }
  git(upstream, "add", "-A");
  git(upstream, "commit", "-q", "-m", message);
  return git(upstream, "rev-parse", "HEAD");
}

// A orcstack root with src/ imported from a fake upstream and dist/ built from it.
function setup() {
  const dir = mkdtempSync(join(tmpdir(), "orcstack-sync-pr-"));
  const upstream = join(dir, "upstream");
  const root = join(dir, "orcstack");
  mkdirSync(upstream);
  git(upstream, "init", "-q", "-b", "main");
  const first = commit(upstream, {
    "pstack/plugin.json": '{ "version": "1.0.0" }\n',
    "pstack/skills/how/SKILL.md": "---\nname: how\ndescription: how\n---\nline1\nline2\nline3\n",
  }, "first");
  for (const path of ["sync", "harness"]) cpSync(join(REPO, path), join(root, path), { recursive: true });
  cpSync(join(REPO, "VERSION"), join(root, "VERSION"));
  const pinFile = join(root, "sync", "upstream.json");
  const config = JSON.parse(readFileSync(pinFile, "utf8"));
  config.pin = { commit: first, version: "1.0.0", date: "2026-01-01" };
  writeFileSync(pinFile, `${JSON.stringify(config, null, 2)}\n`);
  const run = (tool, ...args) => spawnSync(process.execPath, [TOOL(tool), ...args, "--root", root], { encoding: "utf8" });
  assert.equal(run("sync.mjs", "--upstream", upstream, "--init").status, 0);
  assert.equal(run("build.mjs").status, 0);
  const out = join(dir, "out");
  const syncPr = () => {
    const result = run("sync-pr.mjs", "--upstream", upstream, "--out", out);
    return { ...result, json: result.stdout.trim().startsWith("{") ? JSON.parse(result.stdout) : undefined };
  };
  return { upstream, root, first, out, run, syncPr };
}

const pin = (root) => JSON.parse(readFileSync(join(root, "sync", "upstream.json"), "utf8")).pin;
const read = (root, path) => readFileSync(join(root, path), "utf8");

test("does nothing when upstream has not moved", () => {
  const { root, first, syncPr } = setup();
  const before = read(root, "src/skills/how/SKILL.md");
  const result = syncPr();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.action, "none");
  assert.equal(pin(root).commit, first);
  assert.equal(read(root, "src/skills/how/SKILL.md"), before);
});

test("does nothing when upstream changed only files orcstack does not derive", () => {
  const { upstream, root, first, syncPr } = setup();
  commit(upstream, { "other-plugin/README.md": "elsewhere\n", "pstack/assets/logo.txt": "excluded\n" }, "elsewhere");
  const result = syncPr();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.action, "none");
  assert.equal(pin(root).commit, first, "the pin stays until upstream changes what orcstack derives");
});

test("a clean sync moves the pin, rebuilds dist/, and writes a ready PR body", () => {
  const { upstream, root, out, run, syncPr } = setup();
  const second = commit(upstream, {
    "pstack/skills/how/SKILL.md": "---\nname: how\ndescription: how\n---\nline1\nline2 upstream\nline3\n",
    "pstack/skills/fresh/SKILL.md": "---\nname: fresh\ndescription: fresh\n---\nfresh\n",
  }, "second");
  const result = syncPr();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.action, "open");
  assert.equal(result.json.ok, true);
  assert.equal(result.json.draft, false);
  assert.equal(result.json.to, second);
  assert.equal(result.json.branch, `sync/pstack-${second.slice(0, 7)}`);
  assert.match(result.json.title, new RegExp(`^동기화: upstream pstack [0-9a-f]{7} → ${second.slice(0, 7)}$`));
  assert.equal(pin(root).commit, second);
  assert.match(read(root, "dist/claude-code/skills/how/SKILL.md"), /line2 upstream/);
  assert.equal(run("build.mjs", "--check").status, 0, "dist/ matches a fresh build");
  const body = readFileSync(join(out, "body.md"), "utf8");
  assert.match(body, /### 신규 skill \(1\)/);
  assert.match(body, /## 사람이 할 일/);
  assert.match(body, /유지·fork·제외/);
});

test("a conflict keeps the pin and opens a draft PR with the resolution steps", () => {
  const { upstream, root, first, out, syncPr } = setup();
  writeFileSync(join(root, "src", "skills/how/SKILL.md"), "---\nname: how\ndescription: how\n---\nline1\nline2 orcstack\nline3\n");
  const forksFile = join(root, "sync", "forks.json");
  const forks = JSON.parse(read(root, "sync/forks.json"));
  forks.forks.push({ path: "skills/how/SKILL.md", reason: "test", since: first });
  writeFileSync(forksFile, JSON.stringify(forks));
  const second = commit(upstream, { "pstack/skills/how/SKILL.md": "---\nname: how\ndescription: how\n---\nline1\nline2 upstream\nline3\n" }, "second");
  const result = syncPr();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.action, "open");
  assert.equal(result.json.ok, false);
  assert.equal(result.json.draft, true);
  assert.equal(pin(root).commit, first);
  assert.match(read(root, "src/skills/how/SKILL.md"), /<<<<<<< orcstack/);
  const body = readFileSync(join(out, "body.md"), "utf8");
  assert.match(body, /### 충돌 \(1\)/);
  assert.ok(body.includes(`node tools/sync.mjs --upstream <cursor/plugins clone> --to ${second} --resolved`), body);
});
