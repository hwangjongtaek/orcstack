#!/usr/bin/env node
// The deterministic half of an agent-led cutover, run from a orcstack checkout against a target repository
// (ADR-0006). Judgment stays in the adopt-orcstack skill and with the people ADOPTING.md names.
// Usage:
//   node tools/orcstack.mjs preflight --target <repo> [--user-settings <path>]   state, harnesses, decisions a human must make
//   node tools/orcstack.mjs adopt <step> [step args] --target <repo>             run an adopt-orcstack step on the target
//   node tools/orcstack.mjs verify --target <repo>                               judge the cutover; exit 1 while a check fails
//   node tools/orcstack.mjs install --harness <claude-code|codex|omp|opencode> [--apply]
//        the install steps for one harness. Only the opencode link is created, and only with --apply; the other
//        harnesses' CLIs change a person's own settings, so their commands are printed for the person to run.
// Every command prints one JSON object.
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, symlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRecords, readAdrs } from "../src/skills/adopt-orcstack/scripts/records.mjs";

const SKILLS = fileURLToPath(new URL("../src/skills/", import.meta.url));
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const SCRIPT = {
  adopt: join(SKILLS, "adopt-orcstack/scripts/adopt.mjs"),
  brief: join(SKILLS, "work-brief/scripts/brief.mjs"),
  adr: join(SKILLS, "adr/scripts/adr.mjs"),
};

const argv = process.argv.slice(2);
const arg = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const command = argv[0];
const root = arg("--target");
if (!["preflight", "adopt", "verify", "install"].includes(command) || (command !== "install" && !root)) {
  console.error("usage: node tools/orcstack.mjs <preflight|adopt <step>|verify> --target <repo> | install --harness <name> [--apply]");
  process.exit(2);
}
const at = (path) => join(root, path);
const userSettings = arg("--user-settings") ? ["--user-settings", arg("--user-settings")] : [];
const node = (script, ...args) => spawnSync(process.execPath, [script, ...args, "--root", root], { encoding: "utf8" });
const json = (result) => {
  try {
    return JSON.parse(result.stdout);
  } catch {
    return undefined;
  }
};
const git = (...args) => spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
const cutoverAdr = () => readAdrs(root, loadRecords(root).adr).find((r) => r.file.includes("adopt-orcstack"))?.path ?? null;

function preflight() {
  const isRepo = git("rev-parse", "--is-inside-work-tree").stdout.trim() === "true";
  const changes = isRepo ? git("status", "--porcelain").stdout.split("\n").filter(Boolean).length : 0;
  const harnesses = [
    ["agents-md", existsSync(at("AGENTS.md"))],
    ["claude-code", existsSync(at(".claude")) || existsSync(at("CLAUDE.md"))],
    ["codex", existsSync(at(".codex"))],
    ["omp", existsSync(at(".omp"))],
    ["opencode", existsSync(at(".opencode")) || existsSync(at("opencode.json")) || existsSync(at("opencode.jsonc"))],
  ].filter(([, found]) => found).map(([name]) => name);
  // orcstack ships for oh-my-pi, not upstream pi (orcstack SSOT §5). A .pi directory is reported, never installed into.
  const unsupportedHarnesses = existsSync(at(".pi")) ? [{ name: "pi", path: ".pi/", note: "orcstack does not ship for upstream pi (SSOT §5). Its oh-my-pi build is orcstack-omp." }] : [];
  const agents = existsSync(at("AGENTS.md")) ? readFileSync(at("AGENTS.md"), "utf8") : "";
  const governed = { agentsBlock: agents.includes("<!-- orcstack:begin -->"), config: existsSync(at(".orcstack/config.json")), cutoverAdr: cutoverAdr() };
  const detect = json(node(SCRIPT.adopt, "detect", ...userSettings));

  const decisions = [];
  if (changes > 0) decisions.push({ id: "dirty-tree", question: "The target has uncommitted changes. Commit, stash, or confirm they belong in the cutover before any step moves files.", evidence: `${changes} changed paths` });
  if (detect.artifacts.length > 0 && !governed.cutoverAdr) {
    decisions.push({ id: "milestone-boundary", question: "Which milestone boundary does the cutover happen at? Is work the old framework drives still in flight?", evidence: [...new Set(detect.artifacts.map((a) => a.framework))].sort().join(", ") });
  }
  const configured = governed.config && JSON.parse(readFileSync(at(".orcstack/config.json"), "utf8")).records?.ssot;
  if (!configured && detect.records.ssotCandidates.length !== 1) {
    decisions.push({ id: "ssot", question: "Which file is the Planning SSOT? Record it with `adopt records --ssot <file>`.", evidence: detect.records.ssotCandidates.length ? detect.records.ssotCandidates.join(", ") : "none found: scaffold would create docs/planning/SSOT.md" });
  }
  const routing = detect.artifacts.filter((a) => a.signal === "routing instruction");
  if (routing.length) {
    decisions.push({ id: "routing-lines", question: "Approve replacing these routing lines with the orcstack route (show before and after).", evidence: routing.flatMap((a) => a.lines.map((l) => `${a.path}:${l}`)).join(", ") });
  }
  if (unsupportedHarnesses.length) {
    decisions.push({ id: "pi-harness", question: "The target has upstream pi settings, and orcstack does not ship for pi. Do the people who use pi here move to oh-my-pi (`install --harness omp`), or keep pi without orcstack routing? The AGENTS.md block is the only route pi would see.", evidence: ".pi/" });
  }
  if (detect.ignored.length) {
    decisions.push({ id: "ignored-docs", question: "These framework documents are git-ignored local records. Which intent in them moves to the SSOT? They stay local and are never committed.", evidence: detect.ignored.map((a) => a.path).join(", ") });
  }
  return { target: root, git: { repo: isRepo, branch: isRepo ? git("rev-parse", "--abbrev-ref", "HEAD").stdout.trim() : null, clean: changes === 0, changes }, harnesses, unsupportedHarnesses, governed, detect, decisions };
}

function adopt() {
  const step = argv[1];
  const rest = argv.slice(2).filter((a, i, all) => a !== "--target" && all[i - 1] !== "--target");
  const result = node(SCRIPT.adopt, step, ...rest);
  process.stderr.write(result.stderr);
  process.stdout.write(result.stdout);
  process.exit(result.status ?? 1);
}

function verify() {
  const records = loadRecords(root);
  const detect = json(node(SCRIPT.adopt, "detect", ...userSettings));
  const guardPath = at(".orcstack/check-no-sdd.mjs");
  const guard = existsSync(guardPath) ? spawnSync(process.execPath, [guardPath], { cwd: root, encoding: "utf8" }) : undefined;
  const briefPath = `${records.briefs}/adopt-orcstack.md`;
  const brief = existsSync(at(briefPath)) ? node(SCRIPT.brief, "check", "--file", briefPath) : undefined;
  const cutover = cutoverAdr();
  const adrs = cutover ? node(SCRIPT.adr, "check", "--file", cutover) : undefined;
  const legacy = (json(node(SCRIPT.adr, "check"))?.errors ?? []).filter((e) => !cutover || !e.startsWith(cutover));
  const pendingRouting = detect.artifacts.length > 0 && detect.artifacts.every((a) => a.signal === "routing instruction") ? "routing-lines" : undefined;
  const agents = existsSync(at("AGENTS.md")) ? readFileSync(at("AGENTS.md"), "utf8") : "";
  const checks = [
    { id: "no-framework-artifacts", ok: detect.artifacts.length === 0, awaiting: pendingRouting, detail: detect.artifacts.map((a) => `${a.framework} ${a.path} (${a.signal})`) },
    { id: "guard", ok: guard?.status === 0, awaiting: guard ? pendingRouting : undefined, detail: guard ? guard.stdout.trim().split("\n").slice(-3) : ["not installed: run adopt guard"] },
    { id: "agents-block", ok: agents.includes("<!-- orcstack:begin -->"), detail: ["AGENTS.md routes work through orc-mode"] },
    { id: "cutover-adr", ok: cutoverAdr() !== null, detail: [cutoverAdr() ?? `no *adopt-orcstack* ADR in ${records.adr}`] },
    { id: "cutover-brief", ok: brief?.status === 0, detail: brief ? (json(brief)?.errors ?? [brief.stderr.trim()]) : [`${briefPath} does not exist: run adopt scaffold`] },
    { id: "adr-check", ok: !adrs || adrs.status === 0, detail: adrs ? (json(adrs)?.errors ?? []) : ["no cutover ADR yet: see cutover-adr"] },
  ];
  const awaiting = [...new Set(checks.filter((c) => !c.ok && c.awaiting).map((c) => c.awaiting))];
  return { target: root, ok: checks.every((c) => c.ok), awaiting, checks, legacyAdrProblems: legacy, next: "When every check passes, run the cold-start review (cold-start-review skill) before opening the cutover PR." };
}

const HARNESS_COMMANDS = {
  "claude-code": ["claude plugin marketplace add hwangjongtaek/orcstack", "claude plugin install orcstack@orcstack"],
  codex: ["codex plugin marketplace add hwangjongtaek/orcstack", "codex plugin add orcstack@orcstack"],
  omp: ["omp plugin marketplace add hwangjongtaek/orcstack", "omp plugin install orcstack-omp@orcstack --scope=project"],
};
const ROUTING = {
  "claude-code": "The SessionStart hook routes to orc-mode; the AGENTS.md block from adopt scaffold also does.",
  codex: "The AGENTS.md block routes to orc-mode. The hook runs only after the person trusts it in the Codex TUI.",
  omp: "The AGENTS.md block routes to orc-mode. omp does not run the hook. Run the omp commands inside the target repository.",
  opencode: "The AGENTS.md block routes to orc-mode. opencode has no hook. Update with git pull in this orcstack checkout.",
};

function install() {
  const harness = arg("--harness");
  if (!(harness in HARNESS_COMMANDS) && harness !== "opencode") {
    console.error("install needs --harness claude-code, codex, omp, or opencode.");
    process.exit(2);
  }
  if (harness !== "opencode") {
    return { harness, applied: false, steps: HARNESS_COMMANDS[harness].map((c) => ({ kind: "command", command: c })), routing: ROUTING[harness], note: "These change the person's own harness settings. Show them; the person runs them." };
  }
  // One link from opencode's own skills directory to this checkout. Not .agents/skills: Codex and omp read that too,
  // and would load skills rendered with opencode's tool names.
  const config = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  const link = join(config, "opencode", "skills", "orcstack");
  const to = join(DIST, "opencode", "skills");
  const warnings = [join(homedir(), ".agents", "skills", "orc-mode"), join(homedir(), ".claude", "skills", "orc-mode")]
    .filter((p) => existsSync(p))
    .map((p) => `${p} also defines orc-mode; opencode reads that directory too and would see two copies.`);
  let applied = false;
  if (argv.includes("--apply")) {
    const current = (() => {
      try {
        return lstatSync(link).isSymbolicLink() ? readlinkSync(link) : "a non-link file";
      } catch {
        return undefined;
      }
    })();
    if (current !== undefined && current !== to) {
      console.error(`${link} already points at ${current}. Remove it first if it should point at this checkout.`);
      process.exit(1);
    }
    if (current === undefined) {
      mkdirSync(join(config, "opencode", "skills"), { recursive: true });
      symlinkSync(to, link);
    }
    applied = true;
  }
  return { harness, applied, steps: [{ kind: "link", path: link, to }], warnings, routing: ROUTING.opencode };
}

if (command === "adopt") adopt();
if (command === "install") {
  console.log(JSON.stringify(install(), null, 2));
  process.exit(0);
}
const result = command === "preflight" ? preflight() : verify();
console.log(JSON.stringify(result, null, 2));
if (result.ok === false) process.exit(1);
