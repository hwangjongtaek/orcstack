// Contract for .github/workflows/tier2.yml (M5-3, docs/philosophy.md §4 Tier 2): nightly, on demand, and on risk:high PRs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const wf = readFileSync(new URL("../.github/workflows/tier2.yml", import.meta.url), "utf8");

test("runs nightly, on demand, and on PRs labeled risk:high", () => {
  assert.match(wf, /schedule:\n\s+- cron: "[^"]+"/);
  assert.match(wf, /workflow_dispatch:/);
  assert.match(wf, /pull_request:\n\s+types: \[labeled, synchronize\]/);
  assert.match(wf, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'risk:high'\)/);
  assert.doesNotMatch(wf, /\n  push:/, "not on every push");
});

test("runs the full check and the install smoke for all four harnesses", () => {
  assert.match(wf, /run: npm run check/);
  assert.match(wf, /node tests\/e2e\/install-smoke\.mjs --require/);
  for (const pkg of ["@anthropic-ai/claude-code", "@openai/codex", "opencode-ai", "@oh-my-pi/pi-coding-agent"]) assert.ok(wf.includes(pkg), pkg);
  assert.match(wf, /oven-sh\/setup-bun@v2/);
});

test("model e2e runs weekly rather than nightly, and only when an API key or a subscription token is set", () => {
  assert.match(wf, /schedule:\n\s+- cron: "0 18 \* \* \*"[^\n]*\n\s+- cron: "0 19 \* \* 0"/, "a nightly and a weekly schedule");
  const modelJob = wf.slice(wf.indexOf("\n  model-e2e:"));
  assert.match(modelJob, /github\.event\.schedule == '0 19 \* \* 0'/, "on schedule, only the weekly cron");
  assert.match(modelJob, /ANTHROPIC_API_KEY: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/);
  assert.match(modelJob, /CLAUDE_CODE_OAUTH_TOKEN: \$\{\{ secrets\.CLAUDE_CODE_OAUTH_TOKEN \}\}/);
  assert.match(modelJob, /if: env\.ANTHROPIC_API_KEY != '' \|\| env\.CLAUDE_CODE_OAUTH_TOKEN != ''/);
  for (const script of ["tests/e2e/routing.mjs", "tests/e2e/gate.mjs", "tests/e2e/extensions.mjs --case extend", "tests/e2e/extensions.mjs --case off"]) {
    assert.ok(wf.includes(`e2e ${script}\n`), script);
  }
  for (const job of ["check", "install-smoke"]) {
    const body = wf.slice(wf.indexOf(`\n  ${job}:`), wf.indexOf("runs-on", wf.indexOf(`\n  ${job}:`)));
    assert.match(body, /github\.event\.schedule != '0 19 \* \* 0'/, `${job} does not run twice on the weekly cron`);
  }
});

test("npm run e2e:model runs the same model e2e locally on a logged-in Claude Code", () => {
  const scripts = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts;
  for (const script of ["tests/e2e/routing.mjs", "tests/e2e/gate.mjs", "tests/e2e/extensions.mjs --case extend", "tests/e2e/extensions.mjs --case off"]) {
    assert.ok(scripts["e2e:model"]?.includes(`node ${script}`), script);
  }
  assert.equal(scripts["e2e:install"], "node tests/e2e/install-smoke.mjs");
});

test("reads only", () => {
  assert.match(wf, /permissions:\n\s+contents: read\n/);
  assert.doesNotMatch(wf, /contents: write|pull-requests: write/);
});
