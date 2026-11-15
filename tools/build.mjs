#!/usr/bin/env node
// Usage: node tools/build.mjs [--root <dir>] [--check]
// Builds dist/<harness>/ from src/ and harness/*.json. --check fails when dist/ differs from a fresh build (SSOT §6 C6).
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildHarness } from "./lib/build.mjs";
import { HARNESSES, loadHarness } from "./lib/capabilities.mjs";
import { readTree, writeTree } from "./derive.mjs";

export function buildAll(root) {
  const src = existsSync(join(root, "src")) ? readTree(join(root, "src")) : new Map();
  const hooks = existsSync(join(root, "harness", "hooks")) ? readTree(join(root, "harness", "hooks")) : new Map();
  const version = readFileSync(join(root, "VERSION"), "utf8").trim();
  const dist = new Map();
  for (const name of HARNESSES) {
    for (const [path, bytes] of buildHarness(src, loadHarness(root, name), { version, hooks })) dist.set(`${name}/${path}`, bytes);
  }
  return dist;
}

export function staleDist(root) {
  const want = buildAll(root);
  const have = existsSync(join(root, "dist")) ? readTree(join(root, "dist")) : new Map();
  return [...new Set([...want.keys(), ...have.keys()])]
    .sort()
    .filter((path) => !want.get(path) || !have.get(path) || !want.get(path).equals(have.get(path)))
    .map((path) => `dist/${path}`);
}

function main(argv) {
  const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : join(dirname(fileURLToPath(import.meta.url)), "..");
  if (argv.includes("--check")) {
    const stale = staleDist(root);
    for (const path of stale.slice(0, 50)) console.log(path);
    if (stale.length > 0) {
      console.log(`dist/ is out of date (${stale.length} files). Run \`node tools/build.mjs\` and commit the result.`);
      process.exit(1);
    }
    console.log("dist/ is up to date.");
    return;
  }
  const dist = buildAll(root);
  writeTree(join(root, "dist"), dist);
  console.log(`built ${dist.size} files for ${HARNESSES.join(", ")}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
