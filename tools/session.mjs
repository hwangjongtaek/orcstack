#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const at = args.indexOf("--stack");
const separator = args.indexOf("--");
const stack = at === -1 ? process.env.WORKFLOW_STACK : args[at + 1];
if (!["orcstack", "dstack"].includes(stack) || separator === -1 || !args[separator + 1]) {
  console.error("Choose a workflow before launch: node tools/session.mjs --stack <orcstack|dstack> -- <codex|claude|omp|opencode> [args]");
  process.exit(2);
}
const result = spawnSync(args[separator + 1], args.slice(separator + 2), {
  stdio: "inherit",
  env: { ...process.env, WORKFLOW_STACK: stack, DAMA_AUTO_ACTIVATE: stack === "dstack" ? "1" : "0", ORCSTACK_AUTO_ACTIVATE: stack === "orcstack" ? "1" : "0" },
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
