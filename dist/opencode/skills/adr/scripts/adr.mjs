#!/usr/bin/env node
// Architecture decision records. Judgment lives in ../SKILL.md.
// The directory comes from "records.adr" in .orcstack/config.json (default docs/adr), and the numbering width from the
// existing files (orcstack ADR-0005). Both `- 상태: X` lines and `## Status` sections are read.
// Usage: node adr.mjs new --slug <kebab> --title <title> [--milestone <m>] [--date YYYY-MM-DD] [--root <repo>]
//        node adr.mjs supersede <number> --by <number> [--root <repo>]
//        node adr.mjs check [--base <git ref>] [--file <path>] [--root <repo>]   exit 1 on errors; --base also blocks edits
//        to accepted ADRs; --file checks one ADR (numbers still compared against all)
// Every command prints one JSON object.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ADR_FILE, adrNumbering, loadRecords, readAdrs, readStatus, setStatus } from "../../adopt-orcstack/scripts/records.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STATUS = /^(Proposed|Accepted|Rejected|Deprecated|Superseded by ADR-(\d{3,4}))\b/;

const argv = process.argv.slice(2);
const command = argv[0];
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const root = arg("--root", process.cwd());
const at = (path) => join(root, path);
const DIR = loadRecords(root).adr;
const records = () => readAdrs(root, DIR);
const findByNumber = (number) => records().find((r) => r.number && Number(r.number) === Number(number));

function create() {
  const slug = arg("--slug");
  const title = arg("--title");
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !title) {
    console.error("new needs --slug <kebab-case> and --title.");
    process.exit(2);
  }
  const { next } = adrNumbering(records());
  const template = existsSync(at(`${DIR}/_template.md`)) ? at(`${DIR}/_template.md`) : join(HERE, "..", "templates", "adr.md");
  const body = setStatus(readFileSync(template, "utf8").replace(/^# ADR-\S+\s*[:—–-].*$/m, `# ADR-${next}: ${title}`), "Proposed")
    .replace(/^- (날짜|Date):.*$/m, (line, key) => `- ${key}: ${arg("--date", new Date().toISOString().slice(0, 10))}`)
    .replace(/^- (마일스톤|Milestone):.*$/m, (line, key) => `- ${key}: ${arg("--milestone", "")}`.trimEnd());
  const path = `${DIR}/${next}-${slug}.md`;
  mkdirSync(at(DIR), { recursive: true });
  writeFileSync(at(path), body);
  return { created: path, number: next };
}

function supersede() {
  const old = findByNumber(argv[1]);
  const next = findByNumber(arg("--by"));
  if (!old || !next) {
    console.error(`supersede needs two existing ADRs: ADR-${!old ? argv[1] : arg("--by")} does not exist in ${DIR}.`);
    process.exit(1);
  }
  writeFileSync(at(old.path), setStatus(old.text, `Superseded by ADR-${next.number}`));
  return { superseded: old.path, by: next.path };
}

const withoutStatus = (text) => setStatus(text, "");

function check() {
  const errors = [];
  const all = records();
  const numbers = new Set(all.filter((r) => r.number).map((r) => Number(r.number)));
  const seen = new Map();
  const only = arg("--file");
  for (const r of all) {
    if (only && r.path !== only) {
      if (r.number) seen.set(r.number, r.path);
      continue;
    }
    if (!r.number) {
      errors.push(`${r.path}: name ADR files NNNN-slug.md (or the repository's NNN-slug.md).`);
      continue;
    }
    if (seen.has(r.number)) errors.push(`${r.path}: ADR number ${r.number} is used by more than one file (${seen.get(r.number)}).`);
    seen.set(r.number, r.path);
    if (r.titleNumber !== r.number) errors.push(`${r.path}: the title says ADR-${r.titleNumber ?? "?"}, the file name says ${r.number}.`);
    if (r.status === undefined) errors.push(`${r.path}: no status (a "- 상태:" line or a "## Status" section).`);
    else {
      const match = r.status.match(STATUS);
      if (!match) errors.push(`${r.path}: status "${r.status}" does not start with Proposed, Accepted, Rejected, Deprecated, or Superseded by ADR-NNNN.`);
      else if (match[2] && !numbers.has(Number(match[2]))) errors.push(`${r.path}: superseded by ADR-${match[2]}, but ADR-${match[2]} does not exist.`);
    }
  }

  const base = arg("--base");
  if (base) {
    const listed = execFileSync("git", ["-C", root, "ls-tree", "--name-only", `${base}:${DIR}`], { encoding: "utf8" }).split("\n").filter((f) => ADR_FILE.test(f));
    for (const file of listed) {
      const before = execFileSync("git", ["-C", root, "show", `${base}:${DIR}/${file}`], { encoding: "utf8" });
      if (!/^Accepted\b/.test(readStatus(before) ?? "")) continue;
      const now = all.find((r) => r.file === file);
      if (!now) errors.push(`${DIR}/${file}: an accepted ADR was deleted. Mark it superseded by a new ADR instead.`);
      else if (withoutStatus(now.text) !== withoutStatus(before) || !/^(Accepted|Superseded by ADR-\d{3,4})\b/.test(now.status ?? "")) {
        errors.push(`${DIR}/${file}: an accepted ADR changed. Write a new ADR and supersede this one; only the status may change.`);
      }
    }
  }
  return { checked: all.length, errors };
}

const COMMANDS = { new: create, supersede, check };
if (!COMMANDS[command]) {
  console.error("usage: node adr.mjs <new|supersede|check> [--root <repo>]");
  process.exit(2);
}
const result = COMMANDS[command]();
console.log(JSON.stringify(result, null, 2));
if (result.errors?.length) process.exit(1);
