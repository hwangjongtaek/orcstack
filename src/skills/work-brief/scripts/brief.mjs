#!/usr/bin/env node
// Work briefs (docs/briefs/). Judgment lives in ../SKILL.md.
// Paths come from "records" in .orcstack/config.json (orcstack ADR-0005).
// Usage: node brief.mjs new --slug <kebab> --title <title> --ssot "<§n ID...>" [--item <id>] [--date YYYY-MM-DD] [--root <repo>]
//        node brief.mjs check [--base <git ref>] [--root <repo>]   exit 1 when a brief breaks the input gate;
//        with --base, only briefs added or changed since that ref are checked; with --file <path>, only that brief
// Both print one JSON object.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRecords, parseSsot } from "../../adopt-orcstack/scripts/records.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUNDLED_TEMPLATE = join(HERE, "..", "..", "adopt-orcstack", "templates", "brief.md");

const argv = process.argv.slice(2);
const command = argv[0];
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const root = arg("--root", process.cwd());
const at = (path) => join(root, path);
const { ssot: SSOT_PATH, briefs: BRIEFS } = loadRecords(root);

export const readSsot = parseSsot;

// Problems with an SSOT reference such as "§4 F6, §6 C7".
export function checkReference(reference, ssot) {
  const problems = [];
  const sections = [...reference.matchAll(/§(\d+)/g)].map((m) => m[1]);
  if (sections.length === 0) problems.push(`"${reference}" names no SSOT section (§n).`);
  for (const section of sections) if (!ssot.sections.has(section)) problems.push(`§${section} is not a section of ${SSOT_PATH}.`);
  for (const [, id, prefix] of reference.matchAll(/\b(([A-Z]+)\d+)\b/g)) {
    if (ssot.prefixes.has(prefix) && !ssot.ids.has(id)) problems.push(`${id} is not in the SSOT.`);
  }
  return problems;
}

function loadSsot() {
  if (!existsSync(at(SSOT_PATH))) {
    console.error(`${SSOT_PATH} does not exist. Run adopt-orcstack first, or set records.ssot in .orcstack/config.json.`);
    process.exit(2);
  }
  return readSsot(readFileSync(at(SSOT_PATH), "utf8"));
}

function create() {
  const slug = arg("--slug");
  const title = arg("--title");
  const reference = arg("--ssot");
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !title || !reference) {
    console.error("new needs --slug <kebab-case>, --title, and --ssot.");
    process.exit(2);
  }
  const problems = checkReference(reference, loadSsot());
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  const path = `${BRIEFS}/${slug}.md`;
  if (existsSync(at(path))) {
    console.error(`${path} already exists.`);
    process.exit(1);
  }
  const template = existsSync(at(`${BRIEFS}/_template.md`)) ? at(`${BRIEFS}/_template.md`) : BUNDLED_TEMPLATE;
  const item = arg("--item");
  const body = readFileSync(template, "utf8")
    .replace(/^# Brief:.*$/m, `# Brief: ${title}`)
    .replace(/^- SSOT:.*$/m, `- SSOT: ${reference}`)
    .replace(/^- (작업 항목|Work item):.*\n/m, (line, key) => (item ? `- ${key}: ${item}\n` : ""))
    .replace(/^- (날짜|Date):.*$/m, (line, key) => `- ${key}: ${arg("--date", new Date().toISOString().slice(0, 10))}`);
  mkdirSync(dirname(at(path)), { recursive: true });
  writeFileSync(at(path), body);
  return { created: path };
}

function check() {
  const ssot = loadSsot();
  const errors = [];
  const dir = at(BRIEFS);
  let files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md").sort() : [];
  if (arg("--file")) files = files.filter((f) => `${BRIEFS}/${f}` === arg("--file"));
  const base = arg("--base");
  if (base) {
    const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).split("\n").filter(Boolean);
    const touched = new Set([...git("diff", "--name-only", "--diff-filter=AMR", base, "--", BRIEFS), ...git("ls-files", "--others", "--exclude-standard", "--", BRIEFS)]);
    files = files.filter((f) => touched.has(`${BRIEFS}/${f}`));
  }
  for (const file of files) {
    const path = `${BRIEFS}/${file}`;
    const text = readFileSync(at(path), "utf8");
    const reference = text.match(/^- SSOT:(.*)$/m)?.[1].trim();
    if (reference === undefined) errors.push(`${path}: no "- SSOT:" line naming the SSOT section the change serves.`);
    else for (const problem of checkReference(reference, ssot)) errors.push(`${path}: ${problem}`);
    const rows = [...text.matchAll(/^\|\s*(A\d+)\s*\|.*$/gm)];
    if (rows.length === 0) errors.push(`${path}: no acceptance rows (| A1 | ... |).`);
    for (const [line, id] of rows) {
      if (!line.includes("🔒") && !line.includes("📎")) errors.push(`${path}: ${id} does not say whether a permanent guard (🔒) or one-off evidence (📎) covers it.`);
    }
  }
  return { checked: files.length, errors };
}

const COMMANDS = { new: create, check };
if (!COMMANDS[command]) {
  console.error("usage: node brief.mjs <new|check> [--root <repo>]");
  process.exit(2);
}
const result = COMMANDS[command]();
console.log(JSON.stringify(result, null, 2));
if (result.errors?.length) process.exit(1);
