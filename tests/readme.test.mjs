// M5-7: the README quick start is the adoption path most people read first. Its commands and the decisions it lists
// must match the tools, or people follow a path that no longer exists.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
const readme = read("README.md");
const cli = read("tools/orcstack.mjs");
const adopt = read("src/skills/adopt-orcstack/scripts/adopt.mjs");
const section = readme.split(/^## /m).find((s) => s.startsWith("빠른 시작")) ?? "";

test("README quick start walks install, preflight, cutover, verify, and guard refresh in order", () => {
  assert.ok(section, "README has a 빠른 시작 section");
  const steps = ["claude plugin install orcstack@orcstack", "tools/orcstack.mjs preflight", "adopt-orcstack", "tools/orcstack.mjs verify", "tools/orcstack.mjs adopt guard"];
  const at = steps.map((s) => section.indexOf(s));
  assert.ok(at.every((i) => i >= 0), `missing: ${steps.filter((_, i) => at[i] < 0).join(", ")}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, "steps appear in order");
  assert.ok(readme.indexOf("## 빠른 시작") < readme.indexOf("## 코딩 에이전트별 세팅"), "quick start comes before the detailed sections");
});

test("README orcstack.mjs commands and adopt steps exist", () => {
  const commands = new Set(cli.match(/\["preflight", "adopt", "verify", "install"\]/) ? ["preflight", "adopt", "verify", "install"] : []);
  const steps = new Set(Object.keys(Object.fromEntries((adopt.match(/const COMMANDS = \{([^}]*)\}/)?.[1] ?? "").split(",").map((s) => [s.split(":")[0].trim(), 1]))));
  const used = [...readme.matchAll(/tools\/orcstack\.mjs (\w+)(?: (\w+))?/g)];
  assert.ok(used.length > 0);
  for (const [text, command, step] of used) {
    assert.ok(commands.has(command), text);
    if (command === "adopt") assert.ok(steps.has(step), text);
  }
});

test("quick start lists exactly the decisions preflight can ask", () => {
  const asked = [...cli.matchAll(/decisions\.push\(\{ id: "([a-z-]+)"/g)].map((m) => m[1]).sort();
  const listed = [...section.matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]).sort();
  assert.ok(asked.length >= 6);
  assert.deepEqual(listed, asked);
});
