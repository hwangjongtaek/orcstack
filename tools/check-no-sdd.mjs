#!/usr/bin/env node
// Usage: node tools/check-no-sdd.mjs [--root <dir>]
// Fails when the repository holds artifacts of SDD, Spec Kit, Superpowers, or tmux-orchestrator outside docs/archive/.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findFrameworkArtifacts } from "./lib/no-sdd.mjs";
import { readTree } from "./derive.mjs";

const argv = process.argv.slice(2);
const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : join(dirname(fileURLToPath(import.meta.url)), "..");
const found = findFrameworkArtifacts(readTree(root));
for (const { framework, path, signal } of found) console.log(`${framework}\t${path}\t(${signal})`);
if (found.length > 0) {
  console.log(`\n${found.length} artifacts of frameworks that cannot be mixed with orcstack. Move frozen documents to docs/archive/<framework>/ or remove them.`);
  process.exit(1);
}
console.log("no SDD, Spec Kit, Superpowers, tmux-orchestrator, or pstack routing artifacts.");
