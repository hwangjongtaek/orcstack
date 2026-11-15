// ci-tiers writes Tier 0/1/2 GitHub Actions workflows for any repository (docs/philosophy.md §4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../src/skills/ci-tiers/scripts/ci-tiers.mjs", import.meta.url));

function repo(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "orcstack-ci-"));
  for (const [path, body] of Object.entries(files)) writeFileSync(join(root, path), body);
  return root;
}
const run = (root, ...args) => {
  const result = spawnSync(process.execPath, [SCRIPT, "write", ...args, "--root", root], { encoding: "utf8" });
  return { ...result, json: result.stdout.trim().startsWith("{") ? JSON.parse(result.stdout) : undefined };
};
const wf = (root, tier) => readFileSync(join(root, ".github", "workflows", `${tier}.yml`), "utf8");

test("writes three tiers with their triggers, budgets, and commands, detecting a node project", () => {
  const root = repo({ "package.json": "{}" });
  const result = run(root, "--tier0", "npm run lint", "--tier1", "npm test", "--tier2", "npm run test:all");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.json.written, [".github/workflows/tier0.yml", ".github/workflows/tier1.yml", ".github/workflows/tier2.yml"]);
  assert.match(wf(root, "tier0"), /timeout-minutes: 2\n/);
  assert.match(wf(root, "tier0"), /- run: npm run lint\n/);
  assert.match(wf(root, "tier0"), /actions\/setup-node@v4/);
  assert.match(wf(root, "tier1"), /timeout-minutes: 10\n/);
  assert.match(wf(root, "tier1"), /pull_request:/);
  assert.match(wf(root, "tier2"), /schedule:/);
  assert.match(wf(root, "tier2"), /types: \[labeled, synchronize\]/);
  assert.match(wf(root, "tier2"), /contains\(github\.event\.pull_request\.labels\.\*\.name, 'risk:high'\)/);
  assert.match(wf(root, "tier2"), /- run: npm run test:all\n/);
  for (const tier of ["tier0", "tier1", "tier2"]) assert.doesNotMatch(wf(root, tier), /<[a-z-]+>/, `${tier} has no placeholders left`);
});

test("detects python and go setups, and accepts --setup none", () => {
  const py = repo({ "pyproject.toml": "" });
  run(py, "--tier0", "ruff check .");
  assert.match(wf(py, "tier0"), /actions\/setup-python@v5/);
  const go = repo({ "go.mod": "module x\n" });
  run(go, "--tier0", "go vet ./...");
  assert.match(wf(go, "tier0"), /actions\/setup-go@v5/);
  const none = repo({ "package.json": "{}" });
  run(none, "--tier0", "make tier0", "--setup", "none");
  assert.doesNotMatch(wf(none, "tier0"), /setup-/);
});

test("only the tiers given are written, tier0 is required, and existing workflows are kept unless --force", () => {
  const root = repo({ "package.json": "{}" });
  assert.equal(run(root, "--tier1", "npm test").status, 2);
  assert.deepEqual(run(root, "--tier0", "npm run lint").json.written, [".github/workflows/tier0.yml"]);
  assert.ok(!existsSync(join(root, ".github/workflows/tier2.yml")));
  writeFileSync(join(root, ".github/workflows/tier0.yml"), "ours\n");
  assert.deepEqual(run(root, "--tier0", "x").json.kept, [".github/workflows/tier0.yml"]);
  assert.equal(wf(root, "tier0"), "ours\n");
  run(root, "--tier0", "x", "--force");
  assert.match(wf(root, "tier0"), /- run: x\n/);
});
