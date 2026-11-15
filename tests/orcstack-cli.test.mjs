// tools/orcstack.mjs (ADR-0006): the deterministic half of an agent-led cutover, run from a orcstack checkout
// against a target repository. preflight lists the decisions a human must make; verify judges the result.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../tools/orcstack.mjs", import.meta.url));

function target(files) {
  const root = mkdtempSync(join(tmpdir(), "orcstack-target-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd: root, encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  return { root, git };
}

function orcstack(...args) {
  const result = spawnSync(process.execPath, [CLI, ...args, "--user-settings", "/dev/null"], { encoding: "utf8" });
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {}
  return { ...result, json };
}

const PILOT_LIKE = {
  ".gitignore": "specs/local/\n",
  "AGENTS.md": "# Rules\n\nKeep this.\n- Routing: invoke the pstack `poteto-mode` skill first.\n",
  "specs/login/requirements.md": "# Requirements\n",
  "docs/planning/SSOT.md": "# Planning SSOT\n\n## §1 목적\n",
  "docs/product/README.md": "# Backend 기획 SSOT\n\n## 1. 배경\n",
  ".claude/agents/x.md": "x\n",
  ".codex/config.toml": "",
};

test("preflight reports git state, harnesses, and every decision a human must make", () => {
  const { root } = target(PILOT_LIKE);
  mkdirSync(join(root, "specs/local"), { recursive: true });
  writeFileSync(join(root, "specs/local/requirements.md"), "# private\n");
  writeFileSync(join(root, "AGENTS.md"), `${readFileSync(join(root, "AGENTS.md"), "utf8")}\nuncommitted\n`);
  const { status, json } = orcstack("preflight", "--target", root);
  assert.equal(status, 0);
  assert.equal(json.git.clean, false);
  assert.deepEqual(json.harnesses, ["agents-md", "claude-code", "codex"]);
  assert.equal(json.governed.cutoverAdr, null);
  assert.deepEqual(json.decisions.map((d) => d.id), ["dirty-tree", "milestone-boundary", "ssot", "routing-lines", "ignored-docs"]);
  assert.match(json.decisions.find((d) => d.id === "routing-lines").evidence, /AGENTS\.md:4/);
  assert.match(json.decisions.find((d) => d.id === "ssot").evidence, /docs\/planning\/SSOT\.md, docs\/product\/README\.md/);
});

// M5-6 B2: orcstack ships for oh-my-pi, not upstream pi (SSOT §5). A .pi directory is reported as unsupported and
// turned into a decision, never listed as a harness orcstack installs into.
test("preflight reports upstream pi as unsupported and asks whether to move to oh-my-pi", () => {
  const { root } = target({ ...PILOT_LIKE, ".pi/settings.json": "{}\n", ".omp/config.yml": "" });
  const { json } = orcstack("preflight", "--target", root);
  assert.deepEqual(json.harnesses, ["agents-md", "claude-code", "codex", "omp"]);
  assert.deepEqual(json.unsupportedHarnesses.map((h) => h.name), ["pi"]);
  const decision = json.decisions.find((d) => d.id === "pi-harness");
  assert.match(decision.question, /oh-my-pi/);
  assert.equal(decision.evidence, ".pi/");
  assert.equal(orcstack("preflight", "--target", target(PILOT_LIKE).root).json.decisions.some((d) => d.id === "pi-harness"), false);
});

test("adopt runs the adopt-orcstack step against the target", () => {
  const { root } = target(PILOT_LIKE);
  const { status, json } = orcstack("adopt", "detect", "--target", root);
  assert.equal(status, 0);
  assert.ok(json.artifacts.some((a) => a.path === "specs/login/requirements.md"));
});

test("verify fails before the cutover and passes once every step and decision is done", () => {
  const { root } = target(PILOT_LIKE);
  const before = orcstack("verify", "--target", root);
  assert.equal(before.status, 1);
  assert.deepEqual(before.json.checks.filter((c) => !c.ok).map((c) => c.id), ["no-framework-artifacts", "guard", "agents-block", "cutover-adr", "cutover-brief"]);

  for (const step of [["records", "--ssot", "docs/product/README.md"], ["freeze", "--milestone", "M7"], ["disable"], ["scaffold", "--milestone", "M7"], ["guard"]]) {
    assert.equal(orcstack("adopt", ...step, "--target", root).status, 0, step.join(" "));
  }
  const pending = orcstack("verify", "--target", root);
  assert.deepEqual(pending.json.checks.filter((c) => !c.ok).map((c) => c.id), ["no-framework-artifacts", "guard", "cutover-brief"], "routing line and brief SSOT line are still open");

  writeFileSync(join(root, "AGENTS.md"), readFileSync(join(root, "AGENTS.md"), "utf8").replace("- Routing: invoke the pstack `poteto-mode` skill first.\n", ""));
  const brief = join(root, "docs/briefs/adopt-orcstack.md");
  writeFileSync(brief, readFileSync(brief, "utf8").replace(/^- SSOT:.*$/m, "- SSOT: §1"));
  const after = orcstack("verify", "--target", root);
  assert.equal(after.status, 0, JSON.stringify(after.json.checks.filter((c) => !c.ok)));
});

// Plugin-less pilot run findings (F1, F2, F4, F5).
test("verify judges only the cutover ADR, marks failures that wait for an approval, and reports legacy ADR problems apart", () => {
  const { root } = target({ ...PILOT_LIKE, "docs/adr/007-old.md": "# ADR-?: old\n\n## Status\n\nAccepted\n" });
  for (const step of [["records", "--ssot", "docs/product/README.md"], ["freeze", "--milestone", "M7"], ["disable"], ["scaffold", "--milestone", "M7"], ["guard"]]) orcstack("adopt", ...step, "--target", root);
  const brief = join(root, "docs/briefs/adopt-orcstack.md");
  writeFileSync(brief, readFileSync(brief, "utf8").replace(/^- SSOT:.*$/m, "- SSOT: §1"));
  const result = orcstack("verify", "--target", root);
  const byId = Object.fromEntries(result.json.checks.map((c) => [c.id, c]));
  assert.equal(byId["adr-check"].ok, true, JSON.stringify(byId["adr-check"]));
  assert.match(result.json.legacyAdrProblems.join("\n"), /007-old\.md/);
  assert.equal(byId["no-framework-artifacts"].awaiting, "routing-lines");
  assert.equal(byId.guard.awaiting, "routing-lines");
  assert.deepEqual(result.json.awaiting, ["routing-lines"]);
});

test("preflight says whether the record paths come from the config or the defaults", () => {
  const { root } = target(PILOT_LIKE);
  assert.equal(orcstack("preflight", "--target", root).json.detect.records.source, "default");
  orcstack("adopt", "records", "--ssot", "docs/product/README.md", "--target", root);
  assert.equal(orcstack("preflight", "--target", root).json.detect.records.source, "config");
});

test("freeze marks each reference as live or history", () => {
  const { root } = target({ ...PILOT_LIKE, "CHANGELOG.md": "- specs/login/ added\n", "docs/adr/001-x.md": "# ADR-001: x\n\n## Status\n\nAccepted\n\nsee specs/login/\n" });
  const frozen = orcstack("adopt", "freeze", "--milestone", "M7", "--target", root).json;
  const kinds = Object.fromEntries(frozen.references.map((r) => [r.path, r.kind]));
  assert.equal(kinds["CHANGELOG.md"], "history");
  assert.equal(kinds["docs/adr/001-x.md"], "history");
  assert.equal(kinds["AGENTS.md"], undefined, "AGENTS.md does not mention specs/ here");
});

// M3-10 phase 2 (M4-3): install lists the steps per harness. Only the opencode link is created, and only with --apply;
// harness CLIs that change a person's own settings are printed for the person to run.
import { existsSync, readlinkSync, symlinkSync } from "node:fs";

function installEnv() {
  const home = mkdtempSync(join(tmpdir(), "orcstack-home-"));
  return { HOME: home, XDG_CONFIG_HOME: join(home, ".config"), PATH: process.env.PATH };
}
const install = (env, ...args) => {
  const result = spawnSync(process.execPath, [CLI, "install", ...args], { encoding: "utf8", env });
  return { ...result, json: result.stdout.trim().startsWith("{") ? JSON.parse(result.stdout) : undefined };
};
const DIST_OPENCODE = fileURLToPath(new URL("../dist/opencode/skills", import.meta.url));

test("install opencode plans one link into the opencode skills directory and creates it only with --apply", () => {
  const env = installEnv();
  const link = join(env.XDG_CONFIG_HOME, "opencode", "skills", "orcstack");
  const plan = install(env, "--harness", "opencode");
  assert.equal(plan.status, 0, plan.stderr);
  assert.deepEqual(plan.json.steps, [{ kind: "link", path: link, to: DIST_OPENCODE }]);
  assert.equal(plan.json.applied, false);
  assert.ok(!existsSync(link));
  assert.equal(install(env, "--harness", "opencode", "--apply").json.applied, true);
  assert.equal(readlinkSync(link), DIST_OPENCODE);
  assert.equal(install(env, "--harness", "opencode", "--apply").status, 0, "re-running is a no-op");
});

test("install opencode refuses to replace a link that points elsewhere, and warns about a second orc-mode", () => {
  const env = installEnv();
  mkdirSync(join(env.XDG_CONFIG_HOME, "opencode", "skills"), { recursive: true });
  symlinkSync("/elsewhere", join(env.XDG_CONFIG_HOME, "opencode", "skills", "orcstack"));
  mkdirSync(join(env.HOME, ".agents", "skills", "orc-mode"), { recursive: true });
  writeFileSync(join(env.HOME, ".agents", "skills", "orc-mode", "SKILL.md"), "---\nname: orc-mode\n---\n");
  const result = install(env, "--harness", "opencode", "--apply");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /already points at \/elsewhere/);
  assert.match(install(env, "--harness", "opencode").json.warnings.join("\n"), /\.agents\/skills\/orc-mode/);
});

test("install prints the harness commands for a person to run and never runs them", () => {
  const env = installEnv();
  const expected = {
    "claude-code": ["claude plugin marketplace add hwangjongtaek/orcstack", "claude plugin install orcstack@orcstack"],
    codex: ["codex plugin marketplace add hwangjongtaek/orcstack", "codex plugin add orcstack@orcstack"],
    omp: ["omp plugin marketplace add hwangjongtaek/orcstack", "omp plugin install orcstack-omp@orcstack --scope=project"],
  };
  for (const [harness, commands] of Object.entries(expected)) {
    const result = install(env, "--harness", harness, "--apply");
    assert.equal(result.status, 0, harness);
    assert.deepEqual(result.json.steps.map((s) => s.command), commands, harness);
    assert.equal(result.json.applied, false, `${harness} commands are for the person to run`);
  }
  assert.equal(install(env, "--harness", "vim").status, 2);
});
