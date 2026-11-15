// Contract for .github/workflows/sync.yml (M5-1): weekly and manual, writes only to sync/ branches, a person merges.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = readFileSync(new URL("../.github/workflows/sync.yml", import.meta.url), "utf8");

test("runs weekly and on demand", () => {
  assert.match(wf, /schedule:\n\s+- cron: "[^"]+"/);
  assert.match(wf, /workflow_dispatch:/);
  assert.doesNotMatch(wf, /pull_request:|push:/, "not triggered by pushes or PRs");
});

test("decides through tools/sync-pr.mjs and opens a PR from a sync/ branch", () => {
  assert.match(wf, /node tools\/sync-pr\.mjs --upstream [^\n]+ --out /);
  assert.match(wf, /gh pr create[^\n]*--base main[^\n]*--head "\$BRANCH"/);
  assert.match(wf, /BRANCH: \$\{\{ steps\.sync\.outputs\.branch \}\}/);
  assert.match(wf, /git push[^\n]* origin "HEAD:refs\/heads\/\$BRANCH"/);
  for (const line of wf.split("\n").filter((l) => /git push/.test(l))) assert.doesNotMatch(line, /main/, line);
  assert.doesNotMatch(wf, /gh pr merge|--admin/, "a person merges");
});

test("asks only for the permissions it uses", () => {
  assert.match(wf, /permissions:\n\s+contents: write\n\s+pull-requests: write\n/);
});
