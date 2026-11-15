#!/usr/bin/env node
// Writes GitHub Actions workflows for CI Tiers 0-2 (docs/philosophy.md §4). Harness independent.
// Usage: node ci-tiers.mjs write --tier0 <cmd> [--tier1 <cmd>] [--tier2 <cmd>] [--install <cmd>]
//        [--setup node|python|go|none] [--force] [--root <repo>]
// Keeps an existing workflow unless --force. Prints one JSON object.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback);
const root = arg("--root", process.cwd());

const SETUPS = {
  node: "      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n",
  python: "      - uses: actions/setup-python@v5\n        with:\n          python-version: \"3.12\"\n",
  go: "      - uses: actions/setup-go@v5\n        with:\n          go-version: stable\n",
  none: "",
};

function detectSetup() {
  if (existsSync(join(root, "package.json"))) return "node";
  if (["pyproject.toml", "requirements.txt", "setup.py"].some((f) => existsSync(join(root, f)))) return "python";
  if (existsSync(join(root, "go.mod"))) return "go";
  return "none";
}

const PUSH_AND_PR = "on:\n  push:\n    branches: [main]\n  pull_request:\n";
const TIERS = {
  tier0: { title: "Tier 0 structural gate: types, architecture rules, lint, the smallest deterministic tests. Every push and PR.", on: PUSH_AND_PR, minutes: 2 },
  tier1: { title: "Tier 1 contract gate: affected unit, property, contract, cheap integration, and bug regression tests. Every PR; P95 10 minutes with Tier 0.", on: PUSH_AND_PR, minutes: 10 },
  tier2: {
    title: "Tier 2 costly confidence: full integration, migration rehearsal, concurrency and recovery. Nightly, on demand, and on PRs labeled risk:high.",
    on: "on:\n  schedule:\n    - cron: \"0 18 * * *\"\n  workflow_dispatch:\n  pull_request:\n    types: [labeled, synchronize]\n",
    minutes: 60,
    condition: "    if: github.event_name != 'pull_request' || contains(github.event.pull_request.labels.*.name, 'risk:high')\n",
  },
};

function workflow(name, command, setup, install) {
  const tier = TIERS[name];
  return [
    `# ${tier.title}`,
    "# Written by the orcstack ci-tiers skill. Run the same command locally.",
    `name: ${name}`,
    "",
    tier.on,
    "permissions:\n  contents: read\n",
    `concurrency:\n  group: ${name}-\${{ github.ref }}\n  cancel-in-progress: true\n`,
    "jobs:",
    `  ${name}:`,
    "    runs-on: ubuntu-latest",
    `${tier.condition ?? ""}    timeout-minutes: ${tier.minutes}`,
    "    steps:",
    "      - uses: actions/checkout@v4",
    `${SETUPS[setup]}${install ? `      - run: ${install}\n` : ""}      - run: ${command}`,
    "",
  ].join("\n");
}

if (argv[0] !== "write" || !arg("--tier0")) {
  console.error("usage: node ci-tiers.mjs write --tier0 <cmd> [--tier1 <cmd>] [--tier2 <cmd>] [--install <cmd>] [--setup node|python|go|none] [--force]");
  process.exit(2);
}
const setup = arg("--setup", detectSetup());
if (!(setup in SETUPS)) {
  console.error(`--setup must be one of ${Object.keys(SETUPS).join(", ")}.`);
  process.exit(2);
}
const written = [];
const kept = [];
mkdirSync(join(root, ".github", "workflows"), { recursive: true });
for (const name of Object.keys(TIERS)) {
  const command = arg(`--${name}`);
  if (!command) continue;
  const path = `.github/workflows/${name}.yml`;
  if (existsSync(join(root, path)) && !argv.includes("--force")) {
    kept.push(path);
    continue;
  }
  writeFileSync(join(root, path), workflow(name, command, setup, arg("--install")));
  written.push(path);
}
console.log(JSON.stringify({ setup, written, kept }, null, 2));
