#!/usr/bin/env node
// Usage: node tools/validate.mjs [--root <dir>]
// Tier 0 structural gate: sync config, harness tables, attribution, SKILL.md frontmatter, links, denylist residue in src/,
// version agreement (VERSION, package.json, CHANGELOG), dist freshness.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { staleDist } from "./build.mjs";
import { readTree } from "./derive.mjs";
import { CAPABILITIES, HARNESSES, loadHarness } from "./lib/capabilities.mjs";
import { checkVersion } from "./lib/changelog.mjs";
import { scanResidue } from "./lib/derive.mjs";
import { loadSyncConfig } from "./lib/sync-config.mjs";
import { checkAttribution, checkFrontmatter, checkLinks } from "./lib/validate.mjs";

const argv = process.argv.slice(2);
const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : join(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const add = (category, list) => problems.push(...list.map((line) => `${category}: ${line}`));

let config;
try {
  config = loadSyncConfig(join(root, "sync"));
} catch (error) {
  add("sync", [error.message]);
}

for (const name of HARNESSES) {
  try {
    const defined = Object.keys(loadHarness(root, name).capabilities);
    const missing = CAPABILITIES.filter((id) => !defined.includes(id));
    if (missing.length) add("harness", [`${name}.json is missing ${missing.join(", ")}`]);
  } catch (error) {
    add("harness", [`${name}.json: ${error.message}`]);
  }
}

const files = readTree(root);
const docs = new Map([...files].filter(([path]) => !path.startsWith("dist/") && !path.startsWith("docs/archive/")));
if (config) add("attribution", checkAttribution(files, config.upstream.pin.commit));
add("frontmatter", checkFrontmatter(files));
add("links", checkLinks(docs));

if (config) {
  const src = new Map([...files].filter(([path]) => path.startsWith("src/")).map(([path, bytes]) => [path.slice(4), bytes]));
  add("denylist", scanResidue(src, config).map((r) => `src/${r.path}:${r.line}: ${r.id} (${r.kind}) ${r.text}`));
}

const text = (path) => files.get(path)?.toString("utf8");
add("version", checkVersion({
  version: text("VERSION")?.trim(),
  packageVersion: text("package.json") && JSON.parse(text("package.json")).version,
  changelog: text("CHANGELOG.md"),
}));

try {
  add("dist", staleDist(root).map((path) => `${path} differs from a fresh build; run node tools/build.mjs`));
} catch (error) {
  add("dist", [error.message]);
}

for (const line of problems) console.log(line);
if (problems.length > 0) {
  console.log(`\nvalidate: ${problems.length} problems`);
  process.exit(1);
}
console.log("validate: ok");
