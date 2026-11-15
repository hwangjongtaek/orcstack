// M4-5: the orcstack block adopt-orcstack writes into AGENTS.md is the routing path for Codex, oh-my-pi, and opencode,
// so its shape is a contract. scaffold also reports team lines outside the block that contradict it (pilot P6).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ADOPT = fileURLToPath(new URL("../src/skills/adopt-orcstack/scripts/adopt.mjs", import.meta.url));

function repo(files) {
  const root = mkdtempSync(join(tmpdir(), "orcstack-agents-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}
const adopt = (root, ...args) => {
  const result = spawnSync(process.execPath, [ADOPT, ...args, "--root", root, "--user-settings", "/dev/null"], { encoding: "utf8" });
  return { ...result, json: result.stdout.trim().startsWith("{") ? JSON.parse(result.stdout) : undefined };
};
const block = (root) => readFileSync(join(root, "AGENTS.md"), "utf8").match(/<!-- orcstack:begin -->[\s\S]*?<!-- orcstack:end -->/)[0];

test("the orcstack block routes, names every record path, the verify command, and the never-list, in under 30 lines", () => {
  const root = repo({ "package.json": JSON.stringify({ scripts: { check: "npm run lint && npm test" } }), "docs/product/README.md": "# SSOT\n" });
  adopt(root, "records", "--ssot", "docs/product/README.md");
  adopt(root, "scaffold", "--milestone", "M7");
  const text = block(root);
  assert.ok(text.split("\n").length <= 30, `${text.split("\n").length} lines`);
  assert.match(text, /load the `orc-mode` skill/);
  assert.match(text, /\| Product intent \| `docs\/product\/README\.md` \|/);
  assert.match(text, /\| Decisions \| `docs\/adr\/` \|/);
  assert.match(text, /\| Change briefs \| `docs\/briefs\/` \|/);
  assert.match(text, /\| Project changes to orcstack \| `\.orcstack\/config\.json` \|/);
  assert.match(text, /Run `npm run check` before you open a PR/);
  assert.match(text, /## Never/);
  assert.doesNotMatch(text, /<[a-z-]+>/, "no placeholders left");
});

test("the verify line falls back to make targets, then to a pointer at ci-tiers", () => {
  const make = repo({ Makefile: "lint:\n\truff .\n\ncommit-build:\n\tmake lint test\n" });
  adopt(make, "scaffold", "--milestone", "M7");
  assert.match(block(make), /Run `make commit-build` before you open a PR/);
  const none = repo({});
  adopt(none, "scaffold", "--milestone", "M7");
  assert.match(block(none), /No single verify command yet: the `ci-tiers` skill sets one up/);
});

test("scaffold reports team lines outside the block that contradict orcstack, with line numbers", () => {
  const root = repo({
    "AGENTS.md": "# Team\n\n- Operating rule: SDD-governed. Use spec-orchestrator for planning.\n- Keep functions short.\n- Routing: invoke the pstack `poteto-mode` skill first.\n",
  });
  const { json } = adopt(root, "scaffold", "--milestone", "M7");
  assert.deepEqual(json.agentsConflicts.map((c) => c.line), [3, 5]);
  assert.match(json.agentsConflicts[0].text, /SDD-governed/);
  assert.match(readFileSync(join(root, "AGENTS.md"), "utf8"), /Keep functions short\./, "team lines are kept");
});
