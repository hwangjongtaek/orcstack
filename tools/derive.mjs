#!/usr/bin/env node
// Usage: node tools/derive.mjs <upstream pstack dir> [--out <dir>] [--residue]
// Derives the orcstack tree from a checked-out upstream pstack directory and prints a summary.
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { derive } from "./lib/derive.mjs";
import { loadSyncConfig } from "./lib/sync-config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function readTree(dir) {
  const walk = (at) =>
    readdirSync(at).flatMap((name) => {
      if (name === ".git" || name === "node_modules" || name === ".DS_Store") return [];
      const path = join(at, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  return new Map(walk(dir).map((path) => [relative(dir, path).split("\\").join("/"), readFileSync(path)]));
}

export function writeTree(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  for (const [path, bytes] of files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), bytes);
  }
}

function main(argv) {
  const [source, ...rest] = argv;
  if (!source) {
    console.error("usage: node tools/derive.mjs <upstream pstack dir> [--out <dir>] [--residue]");
    process.exit(2);
  }
  const out = rest.includes("--out") ? rest[rest.indexOf("--out") + 1] : undefined;
  const result = derive(readTree(source), loadSyncConfig(join(ROOT, "sync")));
  if (out) writeTree(out, result.files);

  const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
  const lines = new Set(result.residue.map((r) => `${r.path}:${r.line}`));
  const byKind = {};
  for (const r of result.residue) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  console.log(JSON.stringify({
    files: result.files.size,
    excluded: result.excluded.length,
    renamed: sum(result.renamed),
    substituted: sum(result.substituted),
    residue: { hits: result.residue.length, lines: lines.size, byKind },
  }, null, 2));
  if (rest.includes("--residue")) for (const r of result.residue) console.log(`${r.kind}\t${r.id}\t${r.path}:${r.line}\t${r.text}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
