// End-to-end: a fake upstream git repository with a pstack/ subdirectory, synced into a temporary orcstack root.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const CLI = join(REPO, "tools", "sync.mjs");

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

function setup() {
  const dir = mkdtempSync(join(tmpdir(), "orcstack-sync-"));
  const upstream = join(dir, "upstream");
  const root = join(dir, "orcstack");
  mkdirSync(upstream);
  git(upstream, "init", "-q");
  const first = commit(upstream, {
    "pstack/plugin.json": '{ "version": "1.0.0" }\n',
    "pstack/skills/poteto-mode/SKILL.md": "use pstack\n",
    "pstack/skills/how/SKILL.md": "line1\nline2\nline3\n",
  }, "first");
  cpSync(join(REPO, "sync"), join(root, "sync"), { recursive: true });
  const pinFile = join(root, "sync", "upstream.json");
  const config = JSON.parse(readFileSync(pinFile, "utf8"));
  config.pin = { commit: first, version: "1.0.0", date: "2026-01-01" };
  writeFileSync(pinFile, `${JSON.stringify(config, null, 2)}\n`);
  return { upstream, root, first };
}

function sync(root, upstream, ...args) {
  return spawnSync(process.execPath, [CLI, "--root", root, "--upstream", upstream, ...args], { encoding: "utf8" });
}

const src = (root, path) => readFileSync(join(root, "src", path), "utf8");

function registerFork(root, path, since) {
  const file = join(root, "sync", "forks.json");
  const forks = JSON.parse(readFileSync(file, "utf8"));
  forks.forks.push({ path, reason: "test", since });
  writeFileSync(file, JSON.stringify(forks));
}

test("--init imports the pinned commit into an empty src/", () => {
  const { upstream, root } = setup();
  const result = sync(root, upstream, "--init");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(src(root, "skills/orc-mode/SKILL.md"), "use orcstack\n");
});

test("a clean sync updates src/ and moves the pin", () => {
  const { upstream, root } = setup();
  sync(root, upstream, "--init");
  const second = commit(upstream, {
    "pstack/plugin.json": '{ "version": "1.1.0" }\n',
    "pstack/skills/how/SKILL.md": "line1\nline2 upstream\nline3\n",
    "pstack/skills/new/SKILL.md": "new\n",
  }, "second");
  const result = sync(root, upstream, "--to", second);
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(src(root, "skills/how/SKILL.md"), "line1\nline2 upstream\nline3\n");
  assert.equal(src(root, "skills/new/SKILL.md"), "new\n");
  assert.equal(handle(root).commit, second);
  assert.equal(handle(root).version, "1.1.0");
});

test("a conflict leaves markers and keeps the pin", () => {
  const { upstream, root, first } = setup();
  sync(root, upstream, "--init");
  writeFileSync(join(root, "src", "skills/how/SKILL.md"), "line1\nline2 orcstack\nline3\n");
  registerFork(root, "skills/how/SKILL.md", first);
  const second = commit(upstream, { "pstack/skills/how/SKILL.md": "line1\nline2 upstream\nline3\n" }, "second");
  const result = sync(root, upstream, "--to", second);
  assert.equal(result.status, 1);
  assert.match(src(root, "skills/how/SKILL.md"), /<<<<<<< orcstack/);
  assert.equal(handle(root).commit, first);
});

test("an unregistered divergence fails and keeps the pin", () => {
  const { upstream, root, first } = setup();
  sync(root, upstream, "--init");
  writeFileSync(join(root, "src", "skills/how/SKILL.md"), "line1\nline2 orcstack\nline3\n");
  const second = commit(upstream, { "pstack/skills/new/SKILL.md": "new\n" }, "second");
  const result = sync(root, upstream, "--to", second);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /unregisteredForks[\s\S]*skills\/how\/SKILL\.md/);
  assert.equal(handle(root).commit, first);
});

function handle(root) {
  return JSON.parse(readFileSync(join(root, "sync", "upstream.json"), "utf8")).pin;
}

function addSubstitution(root, rule) {
  const file = join(root, "sync", "substitutions.json");
  const subs = JSON.parse(readFileSync(file, "utf8"));
  subs.rules.push(rule);
  writeFileSync(file, JSON.stringify(subs));
}

test("a substitution change alone is flagged as divergence without --base-rules", () => {
  const { upstream, root, first } = setup();
  sync(root, upstream, "--init");
  addSubstitution(root, { id: "test-line2", pattern: "line2", flags: "g", to: "LINE2" });
  const result = sync(root, upstream, "--to", first);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /unregisteredForks[\s\S]*skills\/how\/SKILL\.md/);
});

test("--base-rules re-derives src/ under changed rules at the same pin and merges into forks", () => {
  const { upstream, root, first } = setup();
  sync(root, upstream, "--init");
  const oldRules = join(dirname(root), "old-sync");
  cpSync(join(root, "sync"), oldRules, { recursive: true });
  registerFork(root, "skills/how/SKILL.md", first);
  writeFileSync(join(root, "src", "skills/how/SKILL.md"), "line1\nline2\nline3 orcstack\n");
  addSubstitution(root, { id: "test-line", pattern: "line1", flags: "g", to: "LINE1" });
  const result = sync(root, upstream, "--to", first, "--base-rules", oldRules);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(src(root, "skills/how/SKILL.md"), "LINE1\nline2\nline3 orcstack\n");
  assert.equal(handle(root).commit, first);
});

test("--summary lists new and removed skills by directory", () => {
  const { upstream, root } = setup();
  sync(root, upstream, "--init");
  execFileSync("git", ["-C", upstream, "rm", "-q", "-r", "pstack/skills/how"]);
  const second = commit(upstream, { "pstack/skills/fresh/SKILL.md": "fresh\n", "pstack/skills/fresh/references/a.md": "a\n" }, "second");
  const summaryFile = join(dirname(root), "summary.md");
  const result = sync(root, upstream, "--to", second, "--summary", summaryFile);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const summary = readFileSync(summaryFile, "utf8");
  assert.match(summary, /### 신규 skill \(1\)\n\n- `skills\/fresh\/`/);
  assert.match(summary, /### 사라진 skill \(1\)\n\n- `skills\/how\/`/);
});

test("--resolved moves the pin once the conflicts are fixed and the fork is registered", () => {
  const { upstream, root, first } = setup();
  sync(root, upstream, "--init");
  writeFileSync(join(root, "src", "skills/how/SKILL.md"), "line1\nline2 orcstack\nline3\n");
  registerFork(root, "skills/how/SKILL.md", first);
  const second = commit(upstream, { "pstack/skills/how/SKILL.md": "line1\nline2 upstream\nline3\n" }, "second");
  assert.equal(sync(root, upstream, "--to", second).status, 1);

  const markers = sync(root, upstream, "--to", second, "--resolved");
  assert.equal(markers.status, 1, "conflict markers still in src/");
  assert.match(markers.stdout, /unresolved[\s\S]*skills\/how\/SKILL\.md/);
  assert.equal(handle(root).commit, first);

  writeFileSync(join(root, "src", "skills/how/SKILL.md"), "line1\nline2 orcstack and upstream\nline3\n");
  const resolved = sync(root, upstream, "--to", second, "--resolved");
  assert.equal(resolved.status, 0, resolved.stdout + resolved.stderr);
  assert.equal(handle(root).commit, second);
  assert.equal(src(root, "skills/how/SKILL.md"), "line1\nline2 orcstack and upstream\nline3\n");
});

test("--summary reports the denylist residue left in src/, not the raw derive", () => {
  const { upstream, root, first } = setup();
  commit(upstream, { "pstack/skills/how/SKILL.md": "line1\nOpen the Cursor settings.\nline3\n" }, "residue");
  const pinFile = join(root, "sync", "upstream.json");
  const config = JSON.parse(readFileSync(pinFile, "utf8"));
  config.pin.commit = git(upstream, "rev-parse", "HEAD");
  writeFileSync(pinFile, JSON.stringify(config));
  sync(root, upstream, "--init");
  writeFileSync(join(root, "src", "skills/how/SKILL.md"), "line1\nOpen the settings.\nline3\n");
  registerFork(root, "skills/how/SKILL.md", first);
  const second = commit(upstream, { "pstack/skills/new/SKILL.md": "Open the Cursor settings.\n" }, "second");
  const summaryFile = join(dirname(root), "summary.md");
  const result = sync(root, upstream, "--to", second, "--summary", summaryFile);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const summary = readFileSync(summaryFile, "utf8");
  assert.match(summary, /### src\/ denylist 잔존 \(1\)\n\n- `skills\/new\/SKILL\.md:1` cursor/);
  assert.doesNotMatch(summary, /skills\/how\/SKILL\.md:2/);
});
