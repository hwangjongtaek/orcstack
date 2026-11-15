// Contract for .github/workflows/release.yml (M5-2): main tags each new VERSION once.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");

test("runs only on pushes to main that change VERSION", () => {
  assert.match(wf, /on:\n\s+push:\n\s+branches: \[main\]\n\s+paths: \[VERSION\]\n/);
  assert.doesNotMatch(wf, /pull_request|schedule/);
});

test("creates the tag and release only when the tag does not exist, with notes from the CHANGELOG", () => {
  assert.match(wf, /git ls-remote --exit-code --tags origin "refs\/tags\/\$TAG"/);
  assert.match(wf, /node tools\/release\.mjs notes --version "\$VERSION"/);
  assert.match(wf, /gh release create "\$TAG"[^\n]*--target "\$GITHUB_SHA"[^\n]*--notes-file/);
  assert.doesNotMatch(wf, /--force|git push[^\n]*-f\b|gh release delete/);
});

test("asks only for contents: write", () => {
  assert.match(wf, /permissions:\n\s+contents: write\n\n/);
});
