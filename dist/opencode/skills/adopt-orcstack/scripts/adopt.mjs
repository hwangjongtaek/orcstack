#!/usr/bin/env node
// Deterministic steps of the adopt-orcstack cutover. The judgment steps live in ../SKILL.md.
// Usage: node adopt.mjs <detect|records|freeze|disable|scaffold|guard> [--root <repo>] [--milestone <name>]
//        node adopt.mjs guard [--branch <default branch>]
//        node adopt.mjs records [--ssot <file>] [--adr <dir>] [--briefs <dir>]
//        [--user-settings <path to the user's Claude Code settings.json>] [--date YYYY-MM-DD]
// Every command prints one JSON object and is safe to re-run.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalog } from "./extensions.mjs";
import { adrNumbering, checkRecords, loadRecords, readAdrs, ssotCandidates } from "./records.mjs";
import { PLUGINS, findFrameworkArtifacts, readRepository, splitIgnored } from "./signals.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(HERE, "..", "templates");
const FRAMEWORKS = ["sdd", "speckit", "superpowers"];

const argv = process.argv.slice(2);
const command = argv[0];
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const root = arg("--root", process.cwd());
const userSettings = arg("--user-settings", join(homedir(), ".claude", "settings.json"));
const date = arg("--date", new Date().toISOString().slice(0, 10));

const at = (path) => join(root, path);
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
};
const writeText = (path, text) => {
  mkdirSync(dirname(at(path)), { recursive: true });
  writeFileSync(at(path), text);
};
const writeJson = (path, value) => writeText(path, `${JSON.stringify(value, null, 2)}\n`);
const template = (name) => readFileSync(join(TEMPLATES, name), "utf8");
const enabledPlugins = (settings) => Object.entries(settings?.enabledPlugins ?? {}).filter(([, on]) => on === true).map(([name]) => name);

function requireMilestone() {
  const milestone = arg("--milestone");
  if (!milestone) {
    console.error(`${command} needs --milestone <name>: the boundary the cutover happens at.`);
    process.exit(2);
  }
  return milestone;
}

// The project's existing record layout, so the cutover adopts it instead of adding a second one (orcstack ADR-0005).
function existingRecords() {
  const records = loadRecords(root);
  const source = readJson(at(".orcstack/config.json"))?.records ? "config" : "default";
  return { configured: records, source, ssotCandidates: ssotCandidates(root), adr: { dir: records.adr, ...adrNumbering(readAdrs(root, records.adr)) } };
}

function detect() {
  const nested = [];
  const { artifacts, ignored } = splitIgnored(root, findFrameworkArtifacts(readRepository(root, nested)));
  const user = enabledPlugins(readJson(userSettings));
  return {
    artifacts,
    ignored,
    nested,
    userPlugins: user.filter((name) => PLUGINS.some(([, re]) => re.test(name))),
    tddWorkflow: [...user, ...enabledPlugins(readJson(at(".claude/settings.json")))].some((name) => name.startsWith("platform-dev-team-common@")),
    records: existingRecords(),
  };
}

function freeze() {
  const milestone = requireMilestone();
  const moved = [];
  const { artifacts, ignored } = splitIgnored(root, findFrameworkArtifacts(readRepository(root)));
  for (const { path, framework, signal } of artifacts) {
    if (signal !== "file") continue;
    const to = `docs/archive/${framework}/${path}`;
    mkdirSync(dirname(at(to)), { recursive: true });
    renameSync(at(path), at(to));
    if (to.endsWith(".md")) {
      const body = readFileSync(at(to), "utf8");
      writeFileSync(at(to), `> FROZEN (read-only) on ${date} at the orcstack cutover (milestone ${milestone}). Do not edit. Product intent now lives in ${loadRecords(root).ssot}.\n\n${body}`);
    }
    moved.push({ framework, from: path, to });
  }
  for (const framework of FRAMEWORKS) {
    const entries = moved.filter((m) => m.framework === framework);
    if (entries.length === 0) continue;
    const index = `docs/archive/${framework}/FROZEN.md`;
    const head = existsSync(at(index)) ? readFileSync(at(index), "utf8") : `# Frozen ${framework} documents\n\nRead-only since the orcstack cutover. Do not edit these files or add new ones.\n\n| Original path | Frozen at | Milestone |\n|---|---|---|\n`;
    writeText(index, head + entries.map((m) => `| \`${m.from}\` | ${date} | ${milestone} |\n`).join(""));
  }
  return { milestone, moved, leftIgnored: ignored.filter((a) => a.signal === "file").map((a) => a.path), references: referencesTo(moved) };
}

// Lines elsewhere in the repository that still point at a moved file or its directory, longest match first.
// "history" lines (changelogs, ADRs) record the past and stay as they are; "live" lines are instructions,
// templates, and docs that should point at the archive or drop the reference.
function referencesTo(moved) {
  const adrDir = `${loadRecords(root).adr}/`;
  const history = (path) => /(^|\/)CHANGELOG[^/]*$/i.test(path) || path.startsWith(adrDir);
  if (moved.length === 0) return [];
  const hasFiles = (dir) => existsSync(at(dir)) && readdirSync(at(dir)).some((name) => (statSync(at(`${dir}/${name}`)).isDirectory() ? hasFiles(`${dir}/${name}`) : true));
  const emptied = (path) => {
    const dirs = [];
    for (let dir = dirname(path); dir !== "." && !hasFiles(dir); dir = dirname(dir)) dirs.push(`${dir}/`);
    return dirs;
  };
  const targets = [...new Set(moved.flatMap((m) => [m.from, `${dirname(m.from)}/`, ...emptied(m.from)]))].filter((t) => t !== "./").sort((a, b) => b.length - a.length);
  const out = [];
  for (const [path, bytes] of readRepository(root)) {
    if (bytes.includes(0) || path.startsWith(".orcstack/")) continue;
    bytes.toString("utf8").split("\n").forEach((line, i) => {
      const target = targets.find((t) => line.includes(t));
      if (target) out.push({ path, line: i + 1, target, kind: history(path) ? "history" : "live" });
    });
  }
  return out.sort((a, b) => (a.path === b.path ? a.line - b.line : a.path < b.path ? -1 : 1));
}

function disable() {
  const disabled = [];
  const manual = [];
  const project = readJson(at(".claude/settings.json")) ?? {};
  const candidates = new Set([...enabledPlugins(project), ...enabledPlugins(readJson(userSettings))]);
  for (const name of candidates) {
    if (!PLUGINS.some(([, re]) => re.test(name))) continue;
    project.enabledPlugins = { ...project.enabledPlugins, [name]: false };
    disabled.push(`.claude/settings.json: ${name}`);
  }
  if (disabled.length) writeJson(".claude/settings.json", project);

  for (const file of ["opencode.json"]) {
    const config = readJson(at(file));
    if (!config) continue;
    let changed = false;
    for (const key of ["plugin", "plugins"]) {
      if (!Array.isArray(config[key])) continue;
      const kept = config[key].filter((name) => !String(name).startsWith("superpowers"));
      if (kept.length !== config[key].length) {
        config[key] = kept;
        changed = true;
      }
    }
    if (changed) {
      writeJson(file, config);
      disabled.push(`${file}: superpowers`);
    }
  }
  if (existsSync(at("opencode.jsonc"))) manual.push("opencode.jsonc: remove any superpowers entry from plugin/plugins by hand.");
  manual.push("Codex and oh-my-pi keep plugins in user settings. Remove superpowers or pstack there if installed: `codex plugin remove <name>@<marketplace>` or `omp plugin uninstall <name>`.");
  return { disabled, manual };
}

function frozenList() {
  const rows = [];
  for (const framework of FRAMEWORKS) {
    if (existsSync(at(`docs/archive/${framework}/FROZEN.md`))) rows.push({ framework, path: `docs/archive/${framework}/` });
  }
  return rows;
}

// The one local command that runs the commit build, so the AGENTS.md block can name it.
function verifyLine() {
  const scripts = readJson(at("package.json"))?.scripts ?? {};
  const npm = ["check", "commit-build", "verify", "test"].find((name) => scripts[name]);
  const make = existsSync(at("Makefile")) ? ["commit-build", "check", "verify", "test"].find((name) => new RegExp(`^${name}:`, "m").test(readFileSync(at("Makefile"), "utf8"))) : undefined;
  const command = npm ? (npm === "test" ? "npm test" : `npm run ${npm}`) : make ? `make ${make}` : undefined;
  return command
    ? `Run \`${command}\` before you open a PR. CI runs the same command.`
    : "No single verify command yet: the `ci-tiers` skill sets one up, and CI runs the same command.";
}

// Team lines outside the orcstack block that contradict it: another operating rule, another router, another
// framework's tooling. Reported for the person to approve a replacement; never rewritten here.
const CONFLICT = /\b(?:pstack|SDD|spec[- ]?kit|superpowers)-governed\b|\bspec-orchestrator\b|\bsdd-helper\b|\bspeckit\b|\busing-superpowers\b|\bpoteto-mode\b/i;
function agentsConflicts() {
  if (!existsSync(at("AGENTS.md"))) return [];
  let inBlock = false;
  const out = [];
  readFileSync(at("AGENTS.md"), "utf8").split("\n").forEach((text, i) => {
    if (text.includes("<!-- orcstack:begin -->")) inBlock = true;
    if (!inBlock && CONFLICT.test(text)) out.push({ line: i + 1, text: text.trim() });
    if (text.includes("<!-- orcstack:end -->")) inBlock = false;
  });
  return out;
}

function upsertAgentsBlock(tddWorkflow) {
  const records = loadRecords(root);
  const cutover = readAdrs(root, records.adr).find((r) => r.file.includes("adopt-orcstack"))?.path ?? `${records.adr}/`;
  const block = template("agents-block.md")
    .replace("<tdd-rule>\n", tddWorkflow ? `${template("agents-tdd-rule.md")}` : "")
    .replace("<cutover-adr>", cutover)
    .replace("<ssot>", records.ssot)
    .replace("<adr>", records.adr)
    .replace("<briefs>", records.briefs)
    .replace("<verify>", verifyLine());
  const current = existsSync(at("AGENTS.md")) ? readFileSync(at("AGENTS.md"), "utf8") : "";
  const pattern = /<!-- orcstack:begin -->[\s\S]*?<!-- orcstack:end -->\n?/;
  const next = pattern.test(current) ? current.replace(pattern, block) : `${current}${current && !current.endsWith("\n\n") ? "\n" : ""}${block}`;
  writeText("AGENTS.md", next);
}

function scaffold() {
  const milestone = requireMilestone();
  const created = [];
  const frozen = frozenList();
  const create = (path, text) => {
    if (existsSync(at(path))) return;
    writeText(path, text);
    created.push(path);
  };
  const records = loadRecords(root);
  create(records.ssot, template("SSOT.md").replaceAll("<date>", date));
  const adrs = readAdrs(root, records.adr);
  const replaced = new Set([...frozen.map((f) => f.framework), ...splitIgnored(root, findFrameworkArtifacts(readRepository(root))).artifacts.map((a) => a.framework)]);
  const frameworks = replaced.size ? [...replaced].sort().join(", ") : "none";
  const frozenLines = frozen.length ? frozen.map((f) => `- \`${f.path}\``).join("\n") : "- none";
  const briefPath = `${records.briefs}/adopt-orcstack.md`;
  let cutoverAdr = adrs.find((r) => r.file.includes("adopt-orcstack"))?.path;
  if (!cutoverAdr) {
    const { next } = adrNumbering(adrs);
    cutoverAdr = `${records.adr}/${next}-adopt-orcstack.md`;
    create(
      cutoverAdr,
      template("adr-0001-adopt-orcstack.md")
        .replace(/^# ADR-0001:/m, `# ADR-${next}:`)
        .replaceAll("<date>", date)
        .replaceAll("<milestone>", milestone)
        .replace("<frameworks>", frameworks)
        .replace("<frozen>", frozenLines)
        .replace("<cutover-brief>", briefPath)
        .replace("<ssot>", records.ssot),
    );
  }
  create(
    briefPath,
    template("cutover-brief.md")
      .replaceAll("<date>", date)
      .replaceAll("<milestone>", milestone)
      .replace("<frameworks>", frameworks)
      .replace("<frozen>", frozenLines)
      .replace("<cutover-adr>", cutoverAdr),
  );
  create(`${records.briefs}/_template.md`, template("brief.md"));
  create(".orcstack/config.json", `${JSON.stringify({ version: 1, playbooks: {}, skills: {} }, null, 2)}\n`);
  create(".orcstack/README.md", template("orcstack-readme.md"));
  upsertAgentsBlock(detect().tddWorkflow);
  return { milestone, created, agents: "AGENTS.md", agentsConflicts: agentsConflicts() };
}

// The branch the guard runs on for pushes: --branch, else the remote's default (origin/HEAD), else main.
// Pull requests always run it, so a PR branch runs it once instead of twice (push + pull_request).
function defaultBranch() {
  if (arg("--branch")) return { name: arg("--branch"), source: "--branch" };
  const ref = spawnSync("git", ["-C", root, "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], { encoding: "utf8" });
  const name = ref.status === 0 ? ref.stdout.trim().replace(/^origin\//, "") : "";
  return name ? { name, source: "origin/HEAD" } : { name: "main", source: "fallback" };
}

function guard() {
  const branch = defaultBranch();
  const copies = {
    ".orcstack/signals.mjs": join(HERE, "signals.mjs"),
    ".orcstack/extensions.mjs": join(HERE, "extensions.mjs"),
    ".orcstack/records.mjs": join(HERE, "records.mjs"),
    ".orcstack/check-no-sdd.mjs": join(HERE, "guard.mjs"),
  };
  for (const [to, from] of Object.entries(copies)) {
    mkdirSync(dirname(at(to)), { recursive: true });
    copyFileSync(from, at(to));
  }
  writeText(".github/workflows/orcstack-guard.yml", template("orcstack-guard.yml").replace("<default-branch>", JSON.stringify(branch.name)));
  writeJson(".orcstack/catalog.json", loadCatalog());
  return { installed: [...Object.keys(copies), ".github/workflows/orcstack-guard.yml", ".orcstack/catalog.json"], defaultBranch: branch };
}

// Writes the project's existing record layout into .orcstack/config.json (orcstack ADR-0005), keeping other keys.
function recordsCommand() {
  const section = Object.fromEntries(["ssot", "adr", "briefs"].filter((k) => arg(`--${k}`)).map((k) => [k, arg(`--${k}`)]));
  const { errors } = checkRecords(section);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  const config = readJson(at(".orcstack/config.json")) ?? {};
  const { version, records, ...rest } = config;
  writeJson(".orcstack/config.json", { version: 1, records: { ...records, ...section }, ...rest });
  return { records: loadRecords(root) };
}

const COMMANDS = { detect, freeze, disable, scaffold, guard, records: recordsCommand };
if (!COMMANDS[command]) {
  console.error("usage: node adopt.mjs <detect|records|freeze|disable|scaffold|guard> [--root <repo>] [--milestone <name>]");
  process.exit(2);
}
console.log(JSON.stringify(COMMANDS[command](), null, 2));
