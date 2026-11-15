// Neutral capabilities that canonical skills refer to as {{capability}} tokens (ADR-0003).
// Each harness/<name>.json says how to render every one of them.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const HARNESSES = ["claude-code", "codex", "omp", "opencode"];

export const CAPABILITIES = [
  "spawn-subagent",
  "subagent-general",
  "spawn-readonly",
  "background",
  "resume-subagent",
  "ask-user",
  "todo",
  "isolated-worktree",
  "worktree-root",
  "run-skill",
  "project-rule",
  "project-settings",
  "session-hook",
  "model-default",
  "model-sheet",
  "transcripts",
  "transcripts-root",
  "skill-dir",
  "plugin-dir",
  "surface-check",
  "loop",
];

const TOKEN = /\{\{([a-z0-9]+(?:-[a-z0-9]+)*)\}\}/g;

export function tokensIn(text) {
  return [...text.matchAll(TOKEN)].map((match) => match[1]);
}

export function loadHarness(root, name) {
  return JSON.parse(readFileSync(join(root, "harness", `${name}.json`), "utf8"));
}
