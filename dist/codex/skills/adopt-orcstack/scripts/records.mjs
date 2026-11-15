// Where a orcstack-governed repository keeps its records, and how to read them (orcstack ADR-0005).
// A project that already has an SSOT, ADRs, or briefs names their paths under "records" in .orcstack/config.json;
// orcstack follows them instead of creating a second set. ADR numbering width is read from the existing files.
// Shared by adopt-orcstack, work-brief, adr, and contract-inventory.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, normalize, sep } from "node:path";

export const DEFAULT_RECORDS = { ssot: "docs/planning/SSOT.md", adr: "docs/adr", briefs: "docs/briefs" };

function inside(path) {
  const clean = normalize(path);
  return !isAbsolute(path) && clean !== ".." && !clean.startsWith(`..${sep}`);
}

// Validates the "records" section of .orcstack/config.json and fills in the defaults.
export function checkRecords(section) {
  const errors = [];
  const records = { ...DEFAULT_RECORDS };
  if (section === undefined) return { records, errors };
  if (section === null || typeof section !== "object" || Array.isArray(section)) return { records, errors: ["records: must be an object with ssot, adr, and briefs."] };
  for (const [key, value] of Object.entries(section)) {
    if (!(key in DEFAULT_RECORDS)) {
      errors.push(`records: unknown key "${key}". Use ssot, adr, and briefs.`);
      continue;
    }
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`records.${key}: must be ${key === "ssot" ? "a .md file path" : "a directory path"} relative to the repository.`);
      continue;
    }
    if (!inside(value)) {
      errors.push(`records.${key}: "${value}" must be a path inside the repository.`);
      continue;
    }
    if (key === "ssot" && !value.endsWith(".md")) {
      errors.push(`records.ssot: "${value}" must point at a .md file.`);
      continue;
    }
    records[key] = normalize(value).split(sep).join("/").replace(/\/$/, "");
  }
  return { records, errors };
}

// The record paths for a repository. A missing or broken config falls back to the defaults; the guard reports errors.
export function loadRecords(root) {
  try {
    return checkRecords(JSON.parse(readFileSync(join(root, ".orcstack", "config.json"), "utf8")).records).records;
  } catch {
    return { ...DEFAULT_RECORDS };
  }
}

// Sections are `## §3 ...` or `## 3. ...`; IDs are the first cell of a table row, such as F1 or C7.
export function parseSsot(text) {
  const sections = new Set([...text.matchAll(/^##\s+(?:§\s*)?(\d+)(?=[.\s)]|$)/gm)].map((m) => m[1]));
  const ids = new Set([...text.matchAll(/^\|\s*([A-Z]+\d+)\s*\|/gm)].map((m) => m[1]));
  const prefixes = new Set([...ids].map((id) => id.replace(/\d+$/, "")));
  return { sections, ids, prefixes };
}

// SSOT candidates in a repository that has not set records.ssot: the default path, and Markdown under docs/
// whose first heading names an SSOT.
export function ssotCandidates(root) {
  const found = [];
  if (existsSync(join(root, DEFAULT_RECORDS.ssot))) found.push(DEFAULT_RECORDS.ssot);
  const walk = (dir, rel) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const path = `${rel}/${name.name}`;
      if (name.isDirectory()) {
        if (path !== "docs/archive") walk(join(dir, name.name), path);
      } else if (name.name.endsWith(".md") && path !== DEFAULT_RECORDS.ssot) {
        const heading = readFileSync(join(dir, name.name), "utf8").match(/^#\s+(.*)$/m)?.[1] ?? "";
        if (/\bSSOT\b/i.test(heading)) found.push(path);
      }
    }
  };
  if (existsSync(join(root, "docs"))) walk(join(root, "docs"), "docs");
  return found.sort();
}

export const ADR_FILE = /^(\d{3,4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
const STATUS_LINE = /^- (상태|Status):(.*)$/m;
const STATUS_SECTION = /^## (Status|상태)\n+(.+)$/m;

export function readStatus(text) {
  return (text.match(STATUS_LINE)?.[2] ?? text.match(STATUS_SECTION)?.[2])?.trim();
}

// Replaces the status value in either format: a `- 상태:` line or the first line under `## Status`.
export function setStatus(text, value) {
  if (STATUS_LINE.test(text)) return text.replace(STATUS_LINE, (line, key) => `- ${key}: ${value}`.trimEnd());
  return text.replace(STATUS_SECTION, (block, heading) => `## ${heading}\n\n${value}`);
}

export function readAdrs(root, dir) {
  const full = join(root, dir);
  const files = existsSync(full) ? readdirSync(full).filter((f) => f.endsWith(".md") && !f.startsWith("_") && f.toLowerCase() !== "readme.md").sort() : [];
  return files.map((file) => {
    const text = readFileSync(join(full, file), "utf8");
    return { file, path: `${dir}/${file}`, number: file.match(ADR_FILE)?.[1], titleNumber: text.match(/^# ADR-(\d{3,4})\s*[:—–-]/m)?.[1], text, status: readStatus(text) };
  });
}

// The numbering width most existing ADRs use (4 when there are none), and the next number.
export function adrNumbering(list) {
  const numbered = list.filter((r) => r.number);
  const widths = new Map();
  for (const r of numbered) widths.set(r.number.length, (widths.get(r.number.length) ?? 0) + 1);
  const digits = numbered.length ? [...widths].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0] : 4;
  const max = numbered.length ? Math.max(...numbered.map((r) => Number(r.number))) : 0;
  return { count: numbered.length, digits, next: String(max + 1).padStart(digits, "0") };
}
