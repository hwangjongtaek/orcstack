#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";

const SELF = "orcstack";
const PEER = "dstack";
const emit = (message) => console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: message } }));
if (process.env.ORCSTACK_AUTO_ACTIVATE === "0") process.exit(0);

let input = "";
for await (const chunk of process.stdin) input += chunk;
let cwd = process.cwd();
try { cwd = JSON.parse(input).cwd || cwd; } catch {}
let selection = process.env.WORKFLOW_STACK;
let problem;
if (!selection) {
  for (let at = resolve(cwd); ; at = dirname(at)) {
    const file = join(at, ".workflow-stack.json");
    if (existsSync(file)) {
      try { selection = JSON.parse(readFileSync(file, "utf8")).stack; } catch { problem = `Invalid selection file ${file}.`; }
      if (!selection) problem ||= `Missing stack in ${file}.`;
      break;
    }
    const markers = [SELF, PEER].filter((stack) => existsSync(join(at, `.${stack}`, "config.json")));
    if (markers.length === 1) { selection = markers[0]; break; }
    if (markers.length > 1) { problem = "Both project workflow configurations exist."; break; }
    if (existsSync(join(at, ".git")) || dirname(at) === at) break;
  }
}
if (selection && ![SELF, PEER].includes(selection)) problem = `Unknown WORKFLOW_STACK value ${selection}.`;
if (problem) {
  emit(`${problem} Ask the user to choose ${SELF} or ${PEER}. Do not load either router or change project files until the user chooses. Persist the explicit choice in .workflow-stack.json as {"stack":"<chosen name>"}.`);
  process.exit(0);
}
if (selection === PEER) process.exit(0);

const roots = process.env.WORKFLOW_PLUGIN_ROOTS !== undefined
  ? process.env.WORKFLOW_PLUGIN_ROOTS.split(delimiter).filter(Boolean)
  : [join(process.env.CODEX_HOME || join(homedir(), ".codex"), "plugins", "cache"), join(homedir(), ".claude", "plugins", "cache"), join(homedir(), ".config", "opencode", "skills"), join(homedir(), ".agents", "skills")];
let peerInstalled = false;
const scan = (path, depth) => {
  if (depth > 6 || peerInstalled) return;
  let entries;
  try { entries = readdirSync(path, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if ([PEER, "dama-mode"].includes(entry.name)) { peerInstalled = true; return; }
    if (entry.isDirectory()) scan(join(path, entry.name), depth + 1);
  }
};
for (const root of roots) scan(root, 0);
if (!selection && peerInstalled) {
  emit(`Both ${SELF} and ${PEER} are installed. Ask the user which workflow to use for this project before starting work. Do not load either router, follow earlier automatic activation text, or change project files until the user chooses. Persist the explicit choice in .workflow-stack.json as {"stack":"<chosen name>"}.`);
  process.exit(0);
}
emit(`${SELF} is selected for this session. Load the orc-mode skill from this plugin's absolute path before changing code or documents. Resolve every sibling skill within this same plugin, never by an ambiguous catalog name. Skip routing for quick questions. Check .workflow-stack.json and WORKFLOW_STACK first. If another workflow is active without an explicit selection, ask the user which workflow to use and wait. SDD, Spec Kit, or Superpowers require a cutover before use. If another framework router is active, do not load or follow any of its skills. Set ORCSTACK_AUTO_ACTIVATE=0 to turn this hook off. When launching alongside dstack, use WORKFLOW_STACK=orcstack DAMA_AUTO_ACTIVATE=0 to suppress its existing hook.`);
