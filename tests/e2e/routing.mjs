#!/usr/bin/env node
// Paid routing smoke in Claude Code (Tier 2, M5-3; not part of `npm test`). Repeats the M2-5 record nightly so routing
// drift shows up: without a slash command, work requests reach orc-mode and the matching playbook, a quick question
// does not, and ORCSTACK_AUTO_ACTIVATE=0 turns routing off.
// Usage: node tests/e2e/routing.mjs [--case bug|feature|refactor|question|off] [--repeat <n>] [--dist <claude-code build>] [--model sonnet]
//        Without --case, runs every case. --repeat runs each case n times (routing is a pass rate, not a single run).
//        Prints one JSON report with a pass rate per case; exit 1 when any run fails.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const argv = process.argv.slice(2);
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const model = arg("--model", "sonnet");
const dist = arg("--dist", join(REPO, "dist", "claude-code"));

const CASES = {
  bug: { prompt: "로그인할 때 500 에러가 난다. 고쳐줘.", playbook: "bug-fix" },
  feature: { prompt: "주문 목록 화면에 CSV 내보내기 버튼을 추가해줘.", playbook: "feature" },
  refactor: { prompt: "결제 모듈에 중복된 금액 계산 코드를 정리해줘. 동작은 그대로 유지해.", playbook: "refactoring" },
  question: { prompt: "git rebase와 merge의 차이를 두 문장으로 설명해줘.", playbook: null },
  off: { prompt: "로그인할 때 500 에러가 난다. 고쳐줘.", playbook: null, env: { ORCSTACK_AUTO_ACTIVATE: "0" } },
};

function session({ prompt, env = {} }) {
  const repo = mkdtempSync(join(tmpdir(), "orcstack-routing-"));
  spawnSync("git", ["init", "-q"], { cwd: repo });
  writeFileSync(join(repo, "login.js"), "export const login = (user) => db.find(user.id).session();\n");
  writeFileSync(join(repo, "orders.js"), "export const listOrders = (rows) => rows.map((r) => ({ id: r.id, total: r.total }));\n");
  writeFileSync(join(repo, "payment.js"), "export const charge = (a, b) => a * 1.1 + b * 1.1;\nexport const refund = (a) => a * 1.1;\n");
  // No editing tools: the smoke checks where the session goes first, not the change it would make. node runs the gate scripts.
  const run = spawnSync(
    "claude",
    ["-p", prompt, "--plugin-dir", dist, "--model", model, "--max-turns", "16", "--output-format", "stream-json", "--verbose",
     "--allowedTools", "Bash(node:*),Bash(ls:*),Bash(cat:*),Read,Glob,Grep,Skill"],
    { cwd: repo, env: { ...process.env, ...env }, encoding: "utf8", maxBuffer: 1 << 26, timeout: 600_000 },
  );
  const tools = [];
  let cost = 0;
  let reply = "";
  for (const line of run.stdout.split("\n").filter(Boolean)) {
    const event = JSON.parse(line);
    if (event.type === "assistant") for (const part of event.message.content) if (part.type === "tool_use") tools.push({ name: part.name, input: part.input });
    if (event.type === "result") ({ total_cost_usd: cost = 0, result: reply = "" } = event);
  }
  return { tools, cost, reply: String(reply).slice(0, 400), stderr: run.stderr.trim().slice(0, 300) };
}

const repeat = Number(arg("--repeat", "1"));
const chosen = (arg("--case") ? [arg("--case")] : Object.keys(CASES)).flatMap((name) => Array(repeat).fill(name));
const results = chosen.map((name) => {
  const spec = CASES[name];
  if (!spec) throw new Error(`unknown case ${name}`);
  const { tools, cost, reply, stderr } = session(spec);
  const dama = tools.some((t) => t.name === "Skill" && /(^|:)orc-mode$/.test(t.input.skill ?? ""));
  const playbooks = [...new Set(tools
    .flatMap((t) => [...`${t.input.file_path ?? ""} ${t.input.command ?? ""}`.matchAll(/orc-mode\/playbooks\/([a-z-]+)\.md/g)].map((m) => m[1])))];
  const pass = spec.playbook ? dama && playbooks.includes(spec.playbook) : !dama;
  return { case: name, pass, dama, playbooks, expected: spec.playbook, cost, tools: tools.map((t) => `${t.name}:${t.input.skill ?? t.input.file_path ?? t.input.command ?? ""}`), reply, stderr };
});
const cost = results.reduce((sum, r) => sum + r.cost, 0);
const rate = Object.fromEntries([...new Set(chosen)].map((name) => {
  const runs = results.filter((r) => r.case === name);
  return [name, `${runs.filter((r) => r.pass).length}/${runs.length}`];
}));
console.log(JSON.stringify({ model, cost: Number(cost.toFixed(3)), pass: results.every((r) => r.pass), rate, results }, null, 2));
process.exit(results.every((r) => r.pass) ? 0 : 1);
