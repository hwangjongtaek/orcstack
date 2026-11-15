// P1 (docs/spikes/m3-7-pilot-synapse-backend.md, ADR-0005): orcstack adopts a project's existing record layout
// instead of creating a second SSOT or a second ADR numbering.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS = fileURLToPath(new URL("../src/skills/", import.meta.url));
const SCRIPT = {
  adopt: join(SKILLS, "adopt-orcstack/scripts/adopt.mjs"),
  extensions: join(SKILLS, "adopt-orcstack/scripts/extensions.mjs"),
  brief: join(SKILLS, "work-brief/scripts/brief.mjs"),
  adr: join(SKILLS, "adr/scripts/adr.mjs"),
  inventory: join(SKILLS, "contract-inventory/scripts/inventory.mjs"),
};

// A repository shaped like synapse-backend before its cutover.
const PRODUCT_SSOT = `# Backend 기획 SSOT

## 1. 배경

## 3. 해결할 문제

| ID | 계약 | 실패 비용 |
| --- | --- | --- |
| C1 | 테넌트 격리 | 유출 |
`;
const legacyAdr = (n, status = "Accepted (2026-11-05, ticket none). sign-off pending.") => `# ADR-${n} — 결정 ${n}\n\n## Status\n\n${status}\n\n## Context\n\n본문.\n`;

function repo(extra = {}, config) {
  const root = mkdtempSync(join(tmpdir(), "orcstack-records-"));
  const files = {
    "docs/product/README.md": PRODUCT_SSOT,
    "docs/adr/001-first.md": legacyAdr("001"),
    "docs/adr/078-pstack.md": legacyAdr("078"),
    "docs/adr/README.md": "# ADR index\n",
    "docs/briefs/old-format.md": "# 작업 brief — 옛 형식\n\n> 근거: AGENTS.md\n",
    ...extra,
  };
  if (config) files[".orcstack/config.json"] = JSON.stringify(config);
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}
const RECORDS = { version: 1, records: { ssot: "docs/product/README.md" } };

function run(name, root, ...args) {
  const result = spawnSync(process.execPath, [SCRIPT[name], ...args, "--root", root], { encoding: "utf8" });
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {}
  return { ...result, json };
}
const read = (root, path) => readFileSync(join(root, path), "utf8");
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });

test("resolve reports record paths with defaults and validates the records section", () => {
  assert.deepEqual(run("extensions", repo(), "resolve").json.records, { ssot: "docs/planning/SSOT.md", adr: "docs/adr", briefs: "docs/briefs" });
  assert.deepEqual(run("extensions", repo({}, RECORDS), "resolve").json.records, { ssot: "docs/product/README.md", adr: "docs/adr", briefs: "docs/briefs" });
  for (const [records, pattern] of [
    [{ ssot: "../outside.md" }, /records\.ssot.*inside the repository/],
    [{ ssot: "docs/product" }, /records\.ssot.*\.md file/],
    [{ adr: 3 }, /records\.adr.*directory path/],
    [{ owners: "x" }, /records: unknown key "owners"/],
  ]) {
    const result = run("extensions", repo({}, { version: 1, records }), "resolve");
    assert.equal(result.status, 1, JSON.stringify(records));
    assert.match(result.json.errors.join("\n"), pattern);
  }
});

test("detect reports SSOT candidates and the existing ADR numbering", () => {
  const { json } = run("adopt", repo(), "detect", "--user-settings", "/dev/null");
  assert.deepEqual(json.records.ssotCandidates, ["docs/product/README.md"]);
  assert.deepEqual(json.records.adr, { dir: "docs/adr", count: 2, digits: 3, next: "079" });
});

test("work-brief follows records.ssot and reads `## 1.` section headings", () => {
  const root = repo({}, RECORDS);
  const made = run("brief", root, "new", "--slug", "tenant", "--title", "격리", "--ssot", "§3 C1", "--date", "2026-11-06");
  assert.equal(made.status, 0, made.stderr);
  assert.equal(run("brief", root, "new", "--slug", "x", "--title", "x", "--ssot", "§2").status, 1, "§2 is not a section");
});

test("brief check --base checks only briefs added or changed since the base", () => {
  const root = repo({}, RECORDS);
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  assert.equal(run("brief", root, "check").status, 1, "the old-format brief fails a full check");
  assert.equal(run("brief", root, "check", "--base", "HEAD").status, 0, "nothing changed since the base");
  writeFileSync(join(root, "docs/briefs/new.md"), "# Brief: 새것\n\n- SSOT: §3 C1\n\n| A1 | a | b | 📎 run |\n");
  const result = run("brief", root, "check", "--base", "HEAD");
  assert.equal(result.status, 0, result.stdout);
  assert.equal(result.json.checked, 1);
});

test("adr new continues the existing numbering width", () => {
  const root = repo();
  const made = run("adr", root, "new", "--slug", "adopt-orcstack", "--title", "orcstack", "--date", "2026-11-06");
  assert.equal(made.json.created, "docs/adr/079-adopt-orcstack.md");
  assert.match(read(root, "docs/adr/079-adopt-orcstack.md"), /^# ADR-079: orcstack$/m);
});

test("adr check accepts the `# ADR-078 — title` and `## Status` format, and supersede edits that status", () => {
  const root = repo();
  const checked = run("adr", root, "check");
  assert.equal(checked.status, 0, checked.stdout);
  run("adr", root, "new", "--slug", "next", "--title", "next");
  const result = run("adr", root, "supersede", "001", "--by", "079");
  assert.equal(result.status, 0, result.stderr);
  assert.match(read(root, "docs/adr/001-first.md"), /## Status\n\nSuperseded by ADR-079\n/);
  assert.equal(run("adr", root, "check").status, 0);
});

test("contract-inventory reads the SSOT at records.ssot", () => {
  const { json } = run("inventory", repo({}, RECORDS), "collect");
  assert.deepEqual(json.contracts.map((c) => c.id), ["C1"]);
});

test("scaffold follows records: no second SSOT, and the cutover ADR continues the numbering", () => {
  const root = repo({}, RECORDS);
  const result = run("adopt", root, "scaffold", "--milestone", "M7", "--user-settings", "/dev/null");
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!existsSync(join(root, "docs/planning/SSOT.md")), "no second SSOT");
  assert.ok(result.json.created.includes("docs/adr/079-adopt-orcstack.md"), JSON.stringify(result.json.created));
  assert.match(read(root, "docs/adr/079-adopt-orcstack.md"), /^# ADR-079: /m);
  const agents = read(root, "AGENTS.md");
  assert.match(agents, /see `docs\/adr\/079-adopt-orcstack\.md`/i);
  assert.match(agents, /\| Product intent \| `docs\/product\/README\.md` \|/);
  assert.equal(run("adopt", root, "scaffold", "--milestone", "M7", "--user-settings", "/dev/null").json.created.length, 0, "rerun creates nothing");
});
