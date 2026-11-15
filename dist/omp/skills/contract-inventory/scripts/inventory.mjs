#!/usr/bin/env node
// Collects the contract inventory view (docs/philosophy.md §2): each contract row of the Planning SSOT with the
// briefs, ADRs, and tests that name its ID, and the contracts no guard covers. Judgment lives in ../SKILL.md.
// Usage: node inventory.mjs collect [--root <repo>]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { loadRecords } from "../../adopt-orcstack/scripts/records.mjs";

const argv = process.argv.slice(2);
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const root = arg("--root", process.cwd());
const SKIP = new Set([".git", "node_modules", "dist", "build", "vendor", ".venv", "target", "archive"]);
const TEST = /(^|\/)(tests?|__tests__|spec)\/|[._-](test|spec)\.[a-z]+$/;
const cells = (line) => line.split("|").slice(1, -1).map((c) => c.trim());

// Rows of every SSOT table whose header starts with ID and has a contract column.
export function contractRows(text) {
  const rows = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const header = cells(lines[i]);
    if (header[0] !== "ID" || !header.some((h) => /계약|contract/i.test(h)) || !/^\|[-\s|:]+\|$/.test(lines[i + 1] ?? "")) continue;
    const col = (re) => header.findIndex((h) => re.test(h));
    const [contract, cost, guard] = [col(/계약|contract/i), col(/실패|cost/i), col(/guard/i)];
    for (let j = i + 2; lines[j]?.startsWith("|"); j++) {
      const row = cells(lines[j]);
      rows.push({ id: row[0], contract: row[contract] ?? "", failureCost: cost < 0 ? "" : (row[cost] ?? ""), guard: guard < 0 ? "" : (row[guard] ?? "") });
    }
  }
  return rows;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(relative(root, path).split(sep).join("/"));
  }
  return out;
}

function collect() {
  const records = loadRecords(root);
  const ssotPath = join(root, records.ssot);
  const rows = existsSync(ssotPath) ? contractRows(readFileSync(ssotPath, "utf8")) : [];
  if (rows.length === 0) return { contracts: [], gaps: [], note: "The SSOT has no contract rows (a table with an ID column and a contract column)." };
  const files = walk(root).filter((p) => p !== records.ssot);
  const groups = {
    briefs: files.filter((p) => p.startsWith(`${records.briefs}/`) && p.endsWith(".md") && !p.endsWith("/_template.md")),
    adrs: files.filter((p) => p.startsWith(`${records.adr}/`) && p.endsWith(".md") && !p.endsWith("/_template.md")),
    tests: files.filter((p) => TEST.test(p)),
  };
  const text = new Map();
  const read = (p) => text.get(p) ?? text.set(p, readFileSync(join(root, p), "utf8")).get(p);
  const contracts = rows.map((row) => {
    const named = new RegExp(`\\b${row.id}\\b`);
    const refs = Object.fromEntries(Object.entries(groups).map(([k, list]) => [k, list.filter((p) => named.test(read(p)))]));
    return { ...row, ...refs };
  });
  const gaps = contracts.filter((c) => !c.guard.replace(/[-–—]/g, "").trim() && c.tests.length === 0).map((c) => ({ id: c.id, missing: "guard" }));
  return { contracts, gaps };
}

if (argv[0] !== "collect") {
  console.error("usage: node inventory.mjs collect [--root <repo>]");
  process.exit(2);
}
console.log(JSON.stringify(collect(), null, 2));
