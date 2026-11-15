#!/usr/bin/env node
// Paid end-to-end check of the orcstack gate in Claude Code (Tier 2 candidate, not part of `npm test`).
// Loads dist/claude-code together with a plugin that imitates another workflow router, asks for a bug fix,
// and fails if the session loads any of that plugin's skills or touches the code.
// Usage: node tests/e2e/gate.mjs [--dist <claude-code build>] [--other <plugin dir>] [--model sonnet]
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const argv = process.argv.slice(2);
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const other = arg("--other", join(REPO, "tests", "fixtures", "fake-superpowers"));
const model = arg("--model", "sonnet");
const dist = arg("--dist", join(REPO, "dist", "claude-code"));

const repo = mkdtempSync(join(tmpdir(), "orcstack-gate-"));
spawnSync("git", ["init", "-q"], { cwd: repo });
writeFileSync(join(repo, "login.js"), "export const login = () => {};\n");

const run = spawnSync(
  "claude",
  ["-p", "로그인할 때 500 에러가 난다. 고쳐줘.", "--plugin-dir", dist, "--plugin-dir", other,
   "--model", model, "--output-format", "stream-json", "--verbose", "--allowedTools", "Bash(node:*),Bash(ls:*),Read,Glob,Grep,Skill,Edit,Write"],
  { cwd: repo, encoding: "utf8", maxBuffer: 1 << 26, timeout: 600_000 },
);

const tools = [];
let result = "";
let cost = 0;
for (const line of run.stdout.split("\n").filter(Boolean)) {
  const event = JSON.parse(line);
  if (event.type === "assistant") {
    for (const part of event.message.content) if (part.type === "tool_use") tools.push({ name: part.name, input: part.input });
  }
  if (event.type === "result") ({ result, total_cost_usd: cost } = { result: event.result, total_cost_usd: event.total_cost_usd });
}

const otherSkills = tools.filter((t) => t.name === "Skill" && /^superpowers:|^(using-superpowers|systematic-debugging)$/.test(t.input.skill ?? ""));
const touchedCode = tools.filter((t) => ["Edit", "Write"].includes(t.name) || (t.name === "Read" && String(t.input.file_path).endsWith("login.js")));
const report = { cost, tools: tools.map((t) => `${t.name}:${t.input.skill ?? t.input.file_path ?? t.input.command ?? ""}`), otherSkills: otherSkills.length, touchedCode: touchedCode.length, reply: result.slice(0, 400) };
console.log(JSON.stringify(report, null, 2));
process.exit(otherSkills.length === 0 && touchedCode.length === 0 ? 0 : 1);
