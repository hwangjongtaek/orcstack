// adopt-orcstack scripts against SDD, Spec Kit, and Superpowers fixture repositories (docs/spikes/framework-signals.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const ADOPT = join(REPO, "src", "skills", "adopt-orcstack", "scripts", "adopt.mjs");

const FIXTURES = {
  sdd: {
    "specs/login/requirements.md": "# Requirements\n\nFR-1 users sign in with email.\n",
    "specs/login/specs.md": "# Specs\n\nTS-1 POST /login returns a token.\n",
    "specs/login/plans.md": "# Plans\n\nStep 1 add the endpoint.\n",
    ".claude/settings.json": JSON.stringify({ enabledPlugins: { "sdd-helper@synapse-marketplace": true } }),
    "src/app.js": "export const app = 1;\n",
  },
  speckit: {
    ".specify/memory/constitution.md": "# Constitution\n",
    ".specify/templates/spec-template.md": "# Spec template\n",
    "specs/001-login/spec.md": "# Spec\n",
    "specs/001-login/plan.md": "# Plan\n",
    ".claude/skills/speckit-plan/SKILL.md": "---\nname: speckit-plan\n---\n",
  },
  superpowers: {
    "docs/superpowers/specs/2026-11-01-login-design.md": "# Login design\n",
    "docs/superpowers/plans/2026-11-01-login.md": "# Login plan\n",
    "opencode.json": JSON.stringify({ plugin: ["superpowers@git+https://github.com/obra/superpowers.git", "other-plugin"] }),
  },
};

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), "orcstack-adopt-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}

function adopt(root, ...args) {
  const result = spawnSync(process.execPath, [ADOPT, ...args, "--root", root], { encoding: "utf8" });
  return { ...result, json: result.stdout.trim().startsWith("{") ? JSON.parse(result.stdout) : undefined };
}

const read = (root, path) => readFileSync(join(root, path), "utf8");

for (const [framework, files] of Object.entries(FIXTURES)) {
  test(`${framework}: detect finds the artifacts`, () => {
    const { json } = adopt(fixture(files), "detect");
    assert.ok(json.artifacts.some((a) => a.framework === framework), JSON.stringify(json));
  });

  test(`${framework}: freeze moves files to docs/archive and detect is clean afterwards`, () => {
    const root = fixture(files);
    const frozen = adopt(root, "freeze", "--milestone", "M7");
    assert.equal(frozen.status, 0, frozen.stderr);
    for (const path of frozen.json.moved.map((m) => m.from)) assert.ok(!existsSync(join(root, path)), path);
    for (const { to } of frozen.json.moved) assert.ok(to.startsWith(`docs/archive/${framework}/`), to);
    const md = frozen.json.moved.find((m) => m.to.endsWith(".md") && !m.to.includes("/.claude/skills/"));
    assert.match(read(root, md.to), /^> FROZEN \(read-only\) on \d{4}-\d{2}-\d{2} at the orcstack cutover \(milestone M7\)\./);
    assert.match(read(root, `docs/archive/${framework}/FROZEN.md`), new RegExp(md.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    adopt(root, "disable");
    assert.deepEqual(adopt(root, "detect").json.artifacts, []);
  });
}

test("disable turns plugins off in project settings, including ones only enabled for the user", () => {
  const root = fixture(FIXTURES.sdd);
  const user = join(root, "user-settings.json");
  writeFileSync(user, JSON.stringify({ enabledPlugins: { "superpowers@claude-plugins-official": true, "tmux-orchestrator@orchwang-marketplace": true, "other@x": true } }));
  const result = adopt(root, "disable", "--user-settings", user);
  assert.equal(result.status, 0, result.stderr);
  const plugins = JSON.parse(read(root, ".claude/settings.json")).enabledPlugins;
  assert.equal(plugins["sdd-helper@synapse-marketplace"], false);
  assert.equal(plugins["superpowers@claude-plugins-official"], false);
  assert.equal(plugins["tmux-orchestrator@orchwang-marketplace"], false);
  assert.equal(plugins["other@x"], undefined);
});

test("disable removes Superpowers from opencode.json and keeps other plugins", () => {
  const root = fixture(FIXTURES.superpowers);
  adopt(root, "disable");
  assert.deepEqual(JSON.parse(read(root, "opencode.json")).plugin, ["other-plugin"]);
});

test("scaffold writes the orcstack records once and never overwrites them", () => {
  const root = fixture(FIXTURES.sdd);
  adopt(root, "freeze", "--milestone", "M7");
  const first = adopt(root, "scaffold", "--milestone", "M7");
  assert.equal(first.status, 0, first.stderr);
  for (const path of ["docs/planning/SSOT.md", "docs/adr/0001-adopt-orcstack.md", "docs/briefs/_template.md", "AGENTS.md"]) assert.ok(existsSync(join(root, path)), path);
  assert.match(read(root, "docs/adr/0001-adopt-orcstack.md"), /sdd/);
  assert.match(read(root, "docs/adr/0001-adopt-orcstack.md"), /docs\/archive\/sdd\//);
  writeFileSync(join(root, "docs/planning/SSOT.md"), "# my SSOT\n");
  adopt(root, "scaffold", "--milestone", "M7");
  assert.equal(read(root, "docs/planning/SSOT.md"), "# my SSOT\n");
});

test("scaffold keeps one orcstack block in AGENTS.md and adds the tdd precedence rule when tdd-workflow is enabled", () => {
  const root = fixture({ "AGENTS.md": "# Team rules\n\nKeep this line.\n", ".claude/settings.json": JSON.stringify({ enabledPlugins: { "platform-dev-team-common@synapse-marketplace": true } }) });
  adopt(root, "scaffold", "--milestone", "M7");
  adopt(root, "scaffold", "--milestone", "M7");
  const agents = read(root, "AGENTS.md");
  assert.match(agents, /Keep this line\./);
  assert.equal(agents.match(/<!-- orcstack:begin -->/g).length, 1);
  assert.match(agents, /orc-mode/);
  assert.match(agents, /orcstack `tdd` skill decides/);
});

test("guard blocks a framework artifact added after the cutover", () => {
  const root = fixture(FIXTURES.sdd);
  adopt(root, "freeze", "--milestone", "M7");
  adopt(root, "disable");
  const installed = adopt(root, "guard");
  assert.equal(installed.status, 0, installed.stderr);
  assert.ok(existsSync(join(root, ".github/workflows/orcstack-guard.yml")));
  const guard = () => spawnSync(process.execPath, [join(root, ".orcstack/check-no-sdd.mjs")], { cwd: root, encoding: "utf8" });
  assert.equal(guard().status, 0, guard().stdout);
  mkdirSync(join(root, "specs/signup"), { recursive: true });
  writeFileSync(join(root, "specs/signup/requirements.md"), "# new\n");
  const red = guard();
  assert.equal(red.status, 1);
  assert.match(red.stdout, /sdd\s+specs\/signup\/requirements\.md/);
});

// P3 (docs/spikes/m3-7-pilot-synapse-backend.md): SDD documents that git ignores are private, local records.
// Moving them into docs/archive/ would commit them, so freeze leaves them alone and the guard does not count them.
function gitFixture() {
  const root = fixture({ ".gitignore": "specs/\n", "specs/shared/requirements.md": "# shared\n", "specs/mine/requirements.md": "# private draft\n" });
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("add", ".gitignore");
  git("add", "-f", "specs/shared/requirements.md");
  git("commit", "-q", "-m", "init");
  return root;
}

test("detect separates SDD documents git ignores from tracked ones", () => {
  const { json } = adopt(gitFixture(), "detect");
  assert.deepEqual(json.artifacts.map((a) => a.path), ["specs/shared/requirements.md"]);
  assert.deepEqual(json.ignored.map((a) => a.path), ["specs/mine/requirements.md"]);
});

test("freeze moves only tracked documents and reports the ignored ones it left in place", () => {
  const root = gitFixture();
  const frozen = adopt(root, "freeze", "--milestone", "M7");
  assert.equal(frozen.status, 0, frozen.stderr);
  assert.deepEqual(frozen.json.moved.map((m) => m.from), ["specs/shared/requirements.md"]);
  assert.deepEqual(frozen.json.leftIgnored, ["specs/mine/requirements.md"]);
  assert.equal(read(root, "specs/mine/requirements.md"), "# private draft\n");
  assert.ok(!existsSync(join(root, "docs/archive/sdd/specs/mine")));
});

test("the installed guard does not fail on ignored local SDD documents", () => {
  const root = gitFixture();
  spawnSync("git", ["rm", "-q", "specs/shared/requirements.md"], { cwd: root });
  adopt(root, "guard");
  const result = spawnSync(process.execPath, [join(root, ".orcstack/check-no-sdd.mjs")], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout);
});

// P2 (docs/spikes/m3-7-pilot-synapse-backend.md): pstack's poteto-mode is a second router.
const PSTACK = {
  "AGENTS.md": "# Rules\n\nKeep this.\n- **Routing**: for any non-trivial task, invoke the pstack `poteto-mode` skill first.\n",
  ".claude/settings.json": JSON.stringify({ enabledPlugins: { "pstack@cursor-plugins": true } }),
};

test("detect reports pstack routing instructions with their lines, and an enabled pstack plugin", () => {
  const { json } = adopt(fixture(PSTACK), "detect", "--user-settings", "/dev/null");
  const routing = json.artifacts.find((a) => a.signal === "routing instruction");
  assert.deepEqual(routing, { path: "AGENTS.md", framework: "pstack", signal: "routing instruction", lines: [4] });
  assert.ok(json.artifacts.some((a) => a.framework === "pstack" && a.signal === "enabled plugin"), JSON.stringify(json.artifacts));
});

test("disable turns pstack off, and the orcstack block's own text is not a pstack signal", () => {
  const root = fixture(PSTACK);
  adopt(root, "disable", "--user-settings", "/dev/null");
  assert.equal(JSON.parse(read(root, ".claude/settings.json")).enabledPlugins["pstack@cursor-plugins"], false);
  writeFileSync(join(root, "AGENTS.md"), "# Rules\n\n<!-- orcstack:begin -->\nReplaces the poteto-mode routing.\n<!-- orcstack:end -->\n");
  assert.deepEqual(adopt(root, "detect", "--user-settings", "/dev/null").json.artifacts, []);
});

test("freeze leaves instruction files in place", () => {
  const root = fixture(PSTACK);
  const frozen = adopt(root, "freeze", "--milestone", "M7");
  assert.deepEqual(frozen.json.moved, []);
  assert.match(read(root, "AGENTS.md"), /poteto-mode/);
});

// P4, P5, P9 (docs/spikes/m3-7-pilot-synapse-backend.md): the cutover leaves its own record.
test("freeze lists the files that still point at moved paths", () => {
  const root = fixture({ ...FIXTURES.sdd, "README.md": "# App\n\nSee specs/login/requirements.md for the login rules.\n", "CHANGELOG.md": "- specs/login/ was added\n" });
  const frozen = adopt(root, "freeze", "--milestone", "M7");
  assert.deepEqual(frozen.json.references, [
    { path: "CHANGELOG.md", line: 1, target: "specs/login/", kind: "history" },
    { path: "README.md", line: 3, target: "specs/login/requirements.md", kind: "live" },
  ]);
});

test("scaffold writes a cutover brief that links the cutover ADR and holds the rollback, and the ADR asks for rollback too", () => {
  const root = fixture(FIXTURES.sdd);
  adopt(root, "freeze", "--milestone", "M7");
  const result = adopt(root, "scaffold", "--milestone", "M7");
  assert.ok(result.json.created.includes("docs/briefs/adopt-orcstack.md"), JSON.stringify(result.json.created));
  const brief = read(root, "docs/briefs/adopt-orcstack.md");
  assert.match(brief, /docs\/adr\/0001-adopt-orcstack\.md/);
  assert.match(brief, /^## 되돌리기$/m);
  assert.match(brief, /docs\/archive\/sdd\//);
  assert.match(read(root, "docs/adr/0001-adopt-orcstack.md"), /^## 되돌리기$/m);
});

// Second pilot run (docs/spikes/m3-7-pilot-synapse-backend.md, R1-R4).
test("records writes the records section into .orcstack/config.json with the version and keeps other keys", () => {
  const root = fixture({ ".orcstack/config.json": JSON.stringify({ playbooks: { "visual-parity": "off" } }), "docs/product/README.md": "# SSOT\n" });
  const result = adopt(root, "records", "--ssot", "docs/product/README.md");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(read(root, ".orcstack/config.json")), { version: 1, records: { ssot: "docs/product/README.md" }, playbooks: { "visual-parity": "off" } });
  assert.equal(adopt(root, "records", "--ssot", "../x.md").status, 1);
});

test("freeze also reports references to a directory the move left empty", () => {
  const root = fixture({ ...FIXTURES.sdd, "AGENTS.md": "# Rules\n\n`specs/` is frozen read-only.\n" });
  const frozen = adopt(root, "freeze", "--milestone", "M7");
  assert.ok(frozen.json.references.some((r) => r.path === "AGENTS.md" && r.line === 3 && r.target === "specs/"), JSON.stringify(frozen.json.references));
});

test("the cutover ADR names every framework replaced, pstack routing included, and the configured SSOT", () => {
  const root = fixture({ ...FIXTURES.sdd, "AGENTS.md": "- Routing: invoke the pstack `poteto-mode` skill first.\n", "docs/product/README.md": "# SSOT\n" });
  adopt(root, "records", "--ssot", "docs/product/README.md");
  adopt(root, "freeze", "--milestone", "M7");
  adopt(root, "scaffold", "--milestone", "M7");
  const adr = read(root, "docs/adr/0001-adopt-orcstack.md");
  assert.match(adr, /이전 운영 규칙: pstack, sdd\./);
  assert.match(adr, /docs\/product\/README\.md/);
  assert.doesNotMatch(adr, /docs\/planning\/SSOT\.md/);
});

// M5-6 B1: a subdirectory with its own .git (a worktree under .claude/worktrees/, a submodule, a nested clone) is
// another repository. Its files are not the target's artifacts; detect names it instead of reading it.
test("detect, freeze, and the guard skip nested repositories and report them", () => {
  const root = fixture({
    ".claude/worktrees/feat-x/.git": "gitdir: ../../../.git/worktrees/feat-x\n",
    ".claude/worktrees/feat-x/specs/login/requirements.md": "# other branch\n",
    "vendor/lib/.git/HEAD": "ref: refs/heads/main\n",
    "vendor/lib/specs/x/plans.md": "# nested clone\n",
    "src/app.js": "export const app = 1;\n",
  });
  const { json } = adopt(root, "detect");
  assert.deepEqual(json.artifacts, []);
  assert.deepEqual(json.nested, [".claude/worktrees/feat-x", "vendor/lib"]);
  assert.deepEqual(adopt(root, "freeze", "--milestone", "M7").json.moved, []);
  adopt(root, "guard");
  const guard = spawnSync(process.execPath, [join(root, ".orcstack/check-no-sdd.mjs")], { cwd: root, encoding: "utf8" });
  assert.equal(guard.status, 0, guard.stdout);
});

// M5-6 B3: the guard runs on pull requests and on pushes to the default branch only, so a PR branch runs it once.
test("guard limits push runs to the default branch from --branch, origin/HEAD, or main", () => {
  const root = gitFixture();
  const git = (...args) => spawnSync("git", args, { cwd: root, encoding: "utf8" });
  const workflow = () => read(root, ".github/workflows/orcstack-guard.yml");
  const pushBranches = () => workflow().match(/push:\n\s+branches: \[(.*)\]/)?.[1];

  assert.deepEqual(adopt(root, "guard").json.defaultBranch, { name: "main", source: "fallback" });
  assert.equal(pushBranches(), '"main"');
  assert.match(workflow(), /pull_request:/);

  git("update-ref", "refs/remotes/origin/develop", "HEAD");
  git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/develop");
  assert.deepEqual(adopt(root, "guard").json.defaultBranch, { name: "develop", source: "origin/HEAD" });
  assert.equal(pushBranches(), '"develop"');

  assert.deepEqual(adopt(root, "guard", "--branch", "release/1.x").json.defaultBranch, { name: "release/1.x", source: "--branch" });
  assert.equal(pushBranches(), '"release/1.x"');
});
