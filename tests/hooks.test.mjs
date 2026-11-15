import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const hooks = JSON.parse(readFileSync(`${REPO}harness/hooks/hooks.json`, "utf8"));
const command = hooks.hooks.SessionStart[0].hooks[0].command;
const run = (env) => execFileSync("sh", ["-c", command], { encoding: "utf8", env: { PATH: process.env.PATH, CLAUDE_PLUGIN_ROOT: `${REPO}dist/claude-code`, WORKFLOW_PLUGIN_ROOTS: "", WORKFLOW_STACK: "orcstack", ...env } });

test("the SessionStart hook runs on startup, clear, and compact", () => {
  assert.equal(hooks.hooks.SessionStart[0].matcher, "startup|clear|compact");
});

test("the hook routes new tasks through orc-mode", () => {
  const out = JSON.parse(run({}));
  assert.equal(out.hookSpecificOutput.hookEventName, "SessionStart");
  const context = out.hookSpecificOutput.additionalContext;
  assert.match(context, /orc-mode/);
  assert.match(context, /SDD, Spec Kit, or Superpowers/);
  assert.match(context, /ORCSTACK_AUTO_ACTIVATE=0/);
  assert.match(context, /do not load or follow any of its skills/);
});

test("ORCSTACK_AUTO_ACTIVATE=0 turns the hook off", () => {
  assert.equal(run({ ORCSTACK_AUTO_ACTIVATE: "0" }), "");
});

test("the Claude Code marketplace points at the built plugin", () => {
  const marketplace = JSON.parse(readFileSync(`${REPO}.claude-plugin/marketplace.json`, "utf8"));
  const entry = marketplace.plugins.find((plugin) => plugin.name === "orcstack");
  assert.ok(entry, "orcstack entry");
  const manifest = JSON.parse(readFileSync(`${REPO}${entry.source.replace(/^\.\//, "")}/.claude-plugin/plugin.json`, "utf8"));
  assert.equal(manifest.name, "orcstack");
  assert.ok(existsSync(`${REPO}${entry.source.replace(/^\.\//, "")}/hooks/hooks.json`));
});

test("the fake Superpowers fixture injects the bootstrap markers orcstack detects", () => {
  const fake = JSON.parse(readFileSync(`${REPO}tests/fixtures/fake-superpowers/hooks/hooks.json`, "utf8"));
  const out = JSON.parse(execFileSync("sh", ["-c", fake.hooks.SessionStart[0].hooks[0].command], { encoding: "utf8" }));
  const context = out.hookSpecificOutput.additionalContext;
  assert.match(context, /<EXTREMELY_IMPORTANT>/);
  assert.match(context, /You have superpowers\./);
  for (const skill of ["using-superpowers", "systematic-debugging"]) {
    assert.ok(existsSync(`${REPO}tests/fixtures/fake-superpowers/skills/${skill}/SKILL.md`), skill);
  }
});
