import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadSyncConfig, validateSyncConfig } from "../tools/lib/sync-config.mjs";

const SYNC_DIR = fileURLToPath(new URL("../sync/", import.meta.url));

function validConfig() {
  return {
    upstream: {
      remote: "https://github.com/cursor/plugins.git",
      subdir: "pstack",
      ref: "main",
      pin: { commit: "c742dd61706fbacc1b95f1a20b7b988cf096ce6c", version: "0.15.36" },
      exclude: ["automations/**"],
    },
    rename: {
      rules: [
        { from: "poteto-mode-tools", to: "orc-mode-tools" },
        { from: "poteto-mode", to: "orc-mode" },
      ],
    },
    substitutions: {
      rules: [{ id: "ask-user", pattern: "AskQuestion", flags: "g", to: "{{ask-user}}" }],
    },
    denylist: {
      include: ["**/*.md"],
      terms: [{ id: "cursor", pattern: "\\bCursor\\b", flags: "", kind: "rewrite" }],
    },
    attribution: { lines: ["github\\.com/cursor/plugins"] },
    forks: { forks: [] },
  };
}

function errorsOf(mutate) {
  const config = validConfig();
  mutate(config);
  return validateSyncConfig(config);
}

test("committed sync/ config loads without errors", () => {
  const config = loadSyncConfig(SYNC_DIR);
  assert.ok(config.rename.rules.length > 0);
  assert.ok(config.denylist.terms.length > 0);
});

test("a valid config has no errors", () => {
  assert.deepEqual(validateSyncConfig(validConfig()), []);
});

test("pin must be a full 40-character commit SHA", () => {
  const errors = errorsOf((c) => (c.upstream.pin.commit = "c742dd6"));
  assert.match(errors.join("\n"), /upstream\.pin\.commit/);
});

test("an invalid regex names the rule that holds it", () => {
  const errors = errorsOf((c) => (c.substitutions.rules[0].pattern = "(unclosed"));
  assert.match(errors.join("\n"), /substitutions\.rules\[ask-user\]/);
});

test("a rename rule shadowed by an earlier rule is rejected", () => {
  const errors = errorsOf((c) => c.rename.rules.reverse());
  assert.match(errors.join("\n"), /poteto-mode-tools.*never applies.*poteto-mode/);
});

test("fork entries need a unique path, a reason, and a full SHA", () => {
  const fork = { path: "skills/tdd/SKILL.md", reason: "", since: "c742dd6", ssot: "§6" };
  const errors = errorsOf((c) => (c.forks.forks = [fork, { ...fork, reason: "x" }]));
  const text = errors.join("\n");
  assert.match(text, /forks\[skills\/tdd\/SKILL\.md\]: duplicate path/);
  assert.match(text, /reason/);
  assert.match(text, /since/);
});

test("duplicate rule ids are rejected", () => {
  const errors = errorsOf((c) => c.denylist.terms.push({ ...c.denylist.terms[0] }));
  assert.match(errors.join("\n"), /denylist\.terms: duplicate id cursor/);
});

test("denylist kind must be rewrite or redesign", () => {
  const errors = errorsOf((c) => (c.denylist.terms[0].kind = "other"));
  assert.match(errors.join("\n"), /kind/);
});
