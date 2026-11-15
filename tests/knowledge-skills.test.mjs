// Scripts behind the M3-5 knowledge skills: work-brief, adr, contract-inventory.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const SKILLS = join(REPO, "src", "skills");
const BRIEF = join(SKILLS, "work-brief", "scripts", "brief.mjs");
const ADR = join(SKILLS, "adr", "scripts", "adr.mjs");
const INVENTORY = join(SKILLS, "contract-inventory", "scripts", "inventory.mjs");

const SSOT = `# Planning SSOT

## §1 목적

## §3 기능 범위

| ID | 기능 | 성공 신호 |
|---|---|---|
| F1 | 로그인 | 토큰 발급 |

## §5 지켜야 할 계약

| ID | 계약 | 실패 비용 | guard |
|---|---|---|---|
| C1 | 비밀번호는 평문으로 저장하지 않는다 | 유출 | tests/auth.test.mjs |
| C2 | 결제는 한 번만 청구한다 | 이중 청구 | |
| C3 | 감사 로그는 지우지 않는다 | 규제 위반 | |
`;

function repo(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "orcstack-knowledge-"));
  for (const [path, body] of Object.entries({ "docs/planning/SSOT.md": SSOT, ...files })) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}

function run(script, root, ...args) {
  const result = spawnSync(process.execPath, [script, ...args, "--root", root], { encoding: "utf8" });
  let json;
  try {
    json = JSON.parse(result.stdout);
  } catch {}
  return { ...result, json };
}

const read = (root, path) => readFileSync(join(root, path), "utf8");
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });

const goodBrief = (ssot = "§5 C2", evidence = "🔒 unit(tests/pay.test.mjs)") =>
  `# Brief: 이중 청구 막기\n\n- SSOT: ${ssot}\n- 날짜: 2026-11-06\n\n## Acceptance\n\n| # | 기대 결과 | 금지 결과 | 증거 |\n|---|---|---|---|\n| A1 | 한 번 청구 | 두 번 청구 | ${evidence} |\n`;

// work-brief

test("brief new writes docs/briefs/<slug>.md from the template with the SSOT line and refuses to overwrite", () => {
  const root = repo();
  const first = run(BRIEF, root, "new", "--slug", "double-charge", "--title", "이중 청구 막기", "--ssot", "§5 C2", "--item", "PAY-1", "--date", "2026-11-06");
  assert.equal(first.status, 0, first.stderr);
  const body = read(root, "docs/briefs/double-charge.md");
  assert.match(body, /^# Brief: 이중 청구 막기$/m);
  assert.match(body, /^- SSOT: §5 C2$/m);
  assert.match(body, /^- 작업 항목: PAY-1$/m);
  assert.match(body, /^- 날짜: 2026-11-06$/m);
  assert.equal(run(BRIEF, root, "new", "--slug", "double-charge", "--title", "x", "--ssot", "§5").status, 1);
});

test("brief new prefers the repository's own template", () => {
  const root = repo({ "docs/briefs/_template.md": "# Brief: 제목\n\n- SSOT: §n\n- 날짜: YYYY-MM-DD\n\nTEAM TEMPLATE\n" });
  run(BRIEF, root, "new", "--slug", "x", "--title", "X", "--ssot", "§1", "--date", "2026-11-06");
  assert.match(read(root, "docs/briefs/x.md"), /TEAM TEMPLATE/);
});

test("brief new rejects an SSOT reference the SSOT does not have", () => {
  const result = run(BRIEF, repo(), "new", "--slug", "x", "--title", "X", "--ssot", "§9 C2");
  assert.equal(result.status, 1);
  assert.match(result.stderr + result.stdout, /§9/);
});

test("brief check passes good briefs and skips the template", () => {
  const root = repo({ "docs/briefs/_template.md": "# Brief: 제목\n\n- SSOT: §n\n", "docs/briefs/pay.md": goodBrief() });
  const result = run(BRIEF, root, "check");
  assert.equal(result.status, 0, result.stdout);
  assert.deepEqual(result.json.errors, []);
});

const BAD_BRIEFS = [
  ["no SSOT line", "# Brief: x\n\n## Acceptance\n\n| A1 | a | b | 📎 run |\n", /no "- SSOT:" line/],
  ["unknown section", goodBrief("§9"), /§9 is not a section/],
  ["unknown contract", goodBrief("§5 C9"), /C9 is not in the SSOT/],
  ["row without evidence mark", goodBrief("§5 C2", "unit test"), /A1 does not say/],
  ["no acceptance rows", "# Brief: x\n\n- SSOT: §5 C2\n", /no acceptance rows/],
];
for (const [name, body, pattern] of BAD_BRIEFS) {
  test(`brief check: ${name}`, () => {
    const result = run(BRIEF, repo({ "docs/briefs/bad.md": body }), "check");
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.json.errors.join("\n"), pattern);
  });
}

// adr

const adrFile = (n, title, status, body = "## 결정\n\n하나.\n") => `# ADR-${n}: ${title}\n\n- 상태: ${status}\n- 날짜: 2026-11-01\n\n${body}`;

test("adr new takes the next number and fills the template", () => {
  const root = repo({ "docs/adr/0001-first.md": adrFile("0001", "처음", "Accepted"), "docs/adr/0007-seventh.md": adrFile("0007", "일곱", "Accepted") });
  const result = run(ADR, root, "new", "--slug", "billing-once", "--title", "청구는 한 번", "--milestone", "M4", "--date", "2026-11-06");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.json.created, "docs/adr/0008-billing-once.md");
  const body = read(root, "docs/adr/0008-billing-once.md");
  assert.match(body, /^# ADR-0008: 청구는 한 번$/m);
  assert.match(body, /^- 상태: Proposed$/m);
  assert.match(body, /^- 날짜: 2026-11-06$/m);
  assert.match(body, /^- 마일스톤: M4$/m);
});

test("adr supersede marks the old ADR and leaves its body alone", () => {
  const root = repo({ "docs/adr/0001-old.md": adrFile("0001", "옛 결정", "Accepted"), "docs/adr/0002-new.md": adrFile("0002", "새 결정", "Accepted") });
  const result = run(ADR, root, "supersede", "0001", "--by", "0002");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read(root, "docs/adr/0001-old.md"), adrFile("0001", "옛 결정", "Superseded by ADR-0002"));
  assert.equal(run(ADR, root, "supersede", "0001", "--by", "0009").status, 1);
});

test("adr check passes a clean set", () => {
  const root = repo({ "docs/adr/_template.md": "# ADR-NNNN: 제목\n", "docs/adr/0001-a.md": adrFile("0001", "a", "Superseded by ADR-0002"), "docs/adr/0002-b.md": adrFile("0002", "b", "Accepted") });
  const result = run(ADR, root, "check");
  assert.equal(result.status, 0, result.stdout);
});

const BAD_ADRS = [
  ["duplicate number", { "docs/adr/0001-a.md": adrFile("0001", "a", "Accepted"), "docs/adr/0001-b.md": adrFile("0001", "b", "Accepted") }, /0001 is used by more than one file/],
  ["title number mismatch", { "docs/adr/0002-a.md": adrFile("0003", "a", "Accepted") }, /title says ADR-0003/],
  ["bad status", { "docs/adr/0001-a.md": adrFile("0001", "a", "Done") }, /status "Done"/],
  ["superseded by a missing ADR", { "docs/adr/0001-a.md": adrFile("0001", "a", "Superseded by ADR-0005") }, /ADR-0005 does not exist/],
  ["bad file name", { "docs/adr/adr-1.md": adrFile("0001", "a", "Accepted") }, /NNNN-slug\.md/],
];
for (const [name, files, pattern] of BAD_ADRS) {
  test(`adr check: ${name}`, () => {
    const result = run(ADR, repo(files), "check");
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.json.errors.join("\n"), pattern);
  });
}

test("adr check --base fails when an accepted ADR's body changed, and allows only the move to Superseded", () => {
  const root = repo({ "docs/adr/0001-a.md": adrFile("0001", "a", "Accepted"), "docs/adr/0002-p.md": adrFile("0002", "p", "Proposed") });
  git(root, "init", "-q");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "base");
  const base = git(root, "rev-parse", "HEAD").trim();

  writeFileSync(join(root, "docs/adr/0002-p.md"), adrFile("0002", "p", "Proposed", "## 결정\n\n바뀐 제안.\n"));
  assert.equal(run(ADR, root, "check", "--base", base).status, 0, "a proposed ADR may change");

  writeFileSync(join(root, "docs/adr/0003-c.md"), adrFile("0003", "c", "Accepted"));
  writeFileSync(join(root, "docs/adr/0001-a.md"), adrFile("0001", "a", "Superseded by ADR-0003"));
  assert.equal(run(ADR, root, "check", "--base", base).status, 0, "superseding is allowed");

  writeFileSync(join(root, "docs/adr/0001-a.md"), adrFile("0001", "a", "Accepted", "## 결정\n\n몰래 바꿈.\n"));
  const red = run(ADR, root, "check", "--base", base);
  assert.equal(red.status, 1);
  assert.match(red.json.errors.join("\n"), /0001-a\.md.*accepted.*new ADR/);
});

// contract-inventory

test("inventory collects SSOT contracts with the briefs, ADRs, and tests that name them, and lists gaps", () => {
  const root = repo({
    "docs/briefs/pay.md": goodBrief(),
    "docs/adr/0001-billing.md": adrFile("0001", "청구", "Accepted", "C2를 지킨다.\n"),
    "tests/pay.test.mjs": "// C2: one charge per order\n",
    "node_modules/x/test/c3.test.js": "// C3\n",
  });
  const { status, json } = run(INVENTORY, root, "collect");
  assert.equal(status, 0);
  const byId = Object.fromEntries(json.contracts.map((c) => [c.id, c]));
  assert.deepEqual(Object.keys(byId), ["C1", "C2", "C3"]);
  assert.equal(byId.C1.guard, "tests/auth.test.mjs");
  assert.deepEqual(byId.C2.briefs, ["docs/briefs/pay.md"]);
  assert.deepEqual(byId.C2.adrs, ["docs/adr/0001-billing.md"]);
  assert.deepEqual(byId.C2.tests, ["tests/pay.test.mjs"]);
  assert.deepEqual(byId.C3.tests, [], "node_modules is not searched");
  assert.deepEqual(json.gaps, [{ id: "C3", missing: "guard" }]);
});

test("inventory reports a repository without a contracts table", () => {
  const { status, json } = run(INVENTORY, repo({ "docs/planning/SSOT.md": "# SSOT\n\n## §1 목적\n" }), "collect");
  assert.equal(status, 0);
  assert.deepEqual(json.contracts, []);
  assert.match(json.note, /no contract rows/);
});

test("the knowledge scripts exist where the skills say", () => {
  for (const path of [BRIEF, ADR, INVENTORY]) assert.ok(existsSync(path), path);
});
