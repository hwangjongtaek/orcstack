#!/usr/bin/env node
// Paid end-to-end check of project extensions (ADR-0004) in Claude Code (Tier 2 candidate, not part of `npm test`).
// Asks for a bug fix (a coupon that drives a cart total negative) in a project whose .orcstack/config.json either extends the bug-fix playbook or turns it off.
//   extend: the session must read the extension config, open the bundled playbook and then the project extension, and put the marked step in its checklist.
//   off:    the session must read the extension config and never open the bundled bug-fix playbook.
// Usage: node tests/e2e/extensions.mjs --case extend|off [--dist <claude-code build>] [--model sonnet]
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const argv = process.argv.slice(2);
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const which = arg("--case", "extend");
const model = arg("--model", "sonnet");
const dist = arg("--dist", join(REPO, "dist", "claude-code"));
const MARKER = "EXT-7";

const repo = mkdtempSync(join(tmpdir(), "orcstack-ext-e2e-"));
spawnSync("git", ["init", "-q"], { cwd: repo });
writeFileSync(join(repo, "cart.js"), [
  'import { discount } from "./discount.js";',
  "export function total(items, code) {",
  "  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);",
  "  return subtotal - discount(subtotal, code);",
  "}",
  "",
].join("\n"));
writeFileSync(join(repo, "discount.js"), [
  "const CODES = { WELCOME: { kind: \"flat\", value: 5000 }, HALF: { kind: \"rate\", value: 0.5 } };",
  "export function discount(subtotal, code) {",
  "  const rule = CODES[code];",
  "  if (!rule) return 0;",
  "  return rule.kind === \"flat\" ? rule.value : subtotal * rule.value;",
  "}",
  "",
].join("\n"));
mkdirSync(join(repo, ".orcstack", "playbooks"), { recursive: true });
const config = which === "off" ? { version: 1, playbooks: { "bug-fix": "off" } } : { version: 1, playbooks: { "bug-fix": { extend: "playbooks/bug-fix.md" } } };
writeFileSync(join(repo, ".orcstack", "config.json"), JSON.stringify(config, null, 2));
writeFileSync(
  join(repo, ".orcstack", "playbooks", "bug-fix.md"),
  `# Bug fix: project rules\n\n1. ${MARKER}: before any fix, write the reproduction as a node:test file under \`repro/\` and run it red.\n`,
);

const run = spawnSync(
  "claude",
  ["-p", "고객 문의: 장바구니에 3000원짜리 상품 하나 담고 WELCOME 쿠폰을 쓰면 결제 총액이 음수로 나온다. 고쳐줘.", "--plugin-dir", dist, "--model", model,
   "--output-format", "stream-json", "--verbose", "--allowedTools", "Bash(node:*),Bash(ls:*),Bash(git:*),Read,Glob,Grep,Skill,Edit,Write,TodoWrite"],
  { cwd: repo, encoding: "utf8", maxBuffer: 1 << 26, timeout: 900_000 },
);

const tools = [];
let result = "";
let cost = 0;
const said = [];
for (const line of run.stdout.split("\n").filter(Boolean)) {
  const event = JSON.parse(line);
  if (event.type === "assistant") {
    for (const part of event.message.content) {
      if (part.type === "tool_use") tools.push({ name: part.name, input: part.input });
      if (part.type === "text") said.push(part.text);
    }
  }
  if (event.type === "result") ({ result, total_cost_usd: cost } = { result: event.result, total_cost_usd: event.total_cost_usd });
}

const text = (t) => JSON.stringify(t.input);
const resolved = tools.some((t) => (t.name === "Bash" && /extensions\.mjs resolve/.test(t.input.command ?? "")) || (t.name === "Read" && String(t.input.file_path).endsWith(".orcstack/config.json")));
const readExtension = tools.some((t) => t.name === "Read" && String(t.input.file_path).endsWith(".orcstack/playbooks/bug-fix.md"));
const todoHasMarker = tools.some((t) => /^(TodoWrite|TaskCreate|TaskUpdate)$/.test(t.name) && text(t).includes(MARKER)) || said.some((x) => x.includes(MARKER));
const openedBundled = tools.some((t) => t.name === "Read" && /orc-mode\/playbooks\/bug-fix\.md$/.test(String(t.input.file_path)));
const pass = which === "off" ? resolved && !openedBundled : resolved && openedBundled && readExtension && todoHasMarker;

const report = {
  case: which, cost, resolved, readExtension, todoHasMarker, openedBundled, pass,
  tools: tools.map((t) => `${t.name}:${t.input.skill ?? t.input.file_path ?? t.input.command ?? (t.name === "TodoWrite" ? t.input.todos?.map((x) => x.content).join(" | ") : "")}`),
  reply: result.slice(0, 600),
};
console.log(JSON.stringify(report, null, 2));
process.exit(pass ? 0 : 1);
