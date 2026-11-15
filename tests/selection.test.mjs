import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const hook = join(root, "harness/hooks/session-start.mjs");
const fixture = () => mkdtempSync(join(tmpdir(), "stack-choice-"));
const run = (cwd, env = {}) => {
  const result = spawnSync(process.execPath, [hook], { cwd, input: JSON.stringify({ cwd }), encoding: "utf8", env: { PATH: process.env.PATH, WORKFLOW_PLUGIN_ROOTS: "", ...env } });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout ? JSON.parse(result.stdout).hookSpecificOutput.additionalContext : "";
};

test("coinstalled unselected plugins ask before routing", () => {
  const cwd = fixture();
  mkdirSync(join(cwd, "plugins/dstack"), { recursive: true });
  const message = run(cwd, { WORKFLOW_PLUGIN_ROOTS: join(cwd, "plugins") });
  assert.match(message, /Ask the user which workflow/);
  assert.match(message, /Do not load either router/);
  assert.doesNotMatch(message, /is selected/);
});

test("selection is inherited by nested directories and environment overrides it", () => {
  const cwd = fixture();
  mkdirSync(join(cwd, ".git"));
  mkdirSync(join(cwd, "nested"));
  writeFileSync(join(cwd, ".workflow-stack.json"), '{"stack":"orcstack"}');
  assert.match(run(join(cwd, "nested")), /orcstack is selected/);
  assert.equal(run(join(cwd, "nested"), { WORKFLOW_STACK: "dstack" }), "");
  assert.match(run(cwd, { WORKFLOW_STACK: "unknown" }), /Unknown WORKFLOW_STACK/);
  writeFileSync(join(cwd, ".workflow-stack.json"), "broken");
  assert.match(run(cwd), /Invalid selection file/);
});

test("project markers select one workflow and conflicting markers require a choice", () => {
  const cwd = fixture();
  mkdirSync(join(cwd, ".dstack"));
  writeFileSync(join(cwd, ".dstack/config.json"), "{}");
  assert.equal(run(cwd), "");
  mkdirSync(join(cwd, ".orcstack"));
  writeFileSync(join(cwd, ".orcstack/config.json"), "{}");
  assert.match(run(cwd), /Both project workflow configurations/);
});

test("single installation activates and opt-out emits nothing", () => {
  const cwd = fixture();
  assert.match(run(cwd), /orcstack is selected/);
  assert.equal(run(cwd, { ORCSTACK_AUTO_ACTIVATE: "0" }), "");
});

test("session launcher suppresses the peer hook before starting a harness", () => {
  for (const stack of ["orcstack", "dstack"]) {
    const result = spawnSync(process.execPath, [join(root, "tools/session.mjs"), "--stack", stack, "--", process.execPath, "-e", "console.log(JSON.stringify([process.env.WORKFLOW_STACK,process.env.DAMA_AUTO_ACTIVATE,process.env.ORCSTACK_AUTO_ACTIVATE]))"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), [stack, stack === "dstack" ? "1" : "0", stack === "orcstack" ? "1" : "0"]);
  }
});

test("built hook executes the packaged script through the real shell command", () => {
  const command = JSON.parse(readFileSync(join(root, "dist/codex/hooks/hooks.json"), "utf8")).hooks.SessionStart[0].hooks[0].command;
  const cwd = fixture();
  const result = spawnSync("sh", ["-c", command], { cwd, input: JSON.stringify({ cwd }), encoding: "utf8", env: { PATH: process.env.PATH, CLAUDE_PLUGIN_ROOT: join(root, "dist/codex"), WORKFLOW_PLUGIN_ROOTS: "", WORKFLOW_STACK: "orcstack" } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /orcstack is selected/);
});
