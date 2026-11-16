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
const updateSection = readme.split(/^### /m).find((s) => s.startsWith("orcstack 업데이트")) ?? "";

test("README quick start links to centralized harness update instructions after verification", () => {
  assert.ok(section, "README has a 빠른 시작 section");
  const steps = ["claude plugin install orcstack@orcstack", "tools/orcstack.mjs preflight", "adopt-orcstack", "tools/orcstack.mjs verify", "#orcstack-업데이트"];
  const at = steps.map((s) => section.indexOf(s));
  assert.ok(at.every((i) => i >= 0), `missing: ${steps.filter((_, i) => at[i] < 0).join(", ")}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at, "steps appear in order");
  assert.ok(updateSection, "README has an orcstack 업데이트 section");
  for (const row of [
    "| Claude Code | 어느 디렉터리에서나 | `claude plugin marketplace update orcstack`<br>`claude plugin update orcstack@orcstack` | 두 명령 뒤 Claude Code 재시작 |",
    "| Codex | 어느 디렉터리에서나 | `codex plugin marketplace upgrade`<br>`codex plugin add orcstack@orcstack` | 설치본이 복사본이므로 두 번째 명령으로 다시 설치 |",
    "| oh-my-pi | orcstack을 프로젝트 범위로 설치한 대상 프로젝트 디렉터리 | `omp plugin upgrade` | 없음 |",
    "| opencode | 클론한 orcstack 저장소 | `git pull` | 기존 `~/.config/opencode/skills/orcstack` 링크는 같은 `dist/opencode/skills`를 가리키므로 다시 만들 필요 없음 |",
  ]) assert.ok(updateSection.includes(row), `missing update row: ${row}`);
  assert.ok(updateSection.includes("node tools/orcstack.mjs adopt guard --target ~/work/my-project"));
  assert.equal((readme.match(/tools\/orcstack\.mjs adopt guard/g) ?? []).length, 1, "guard refresh has one source");
  assert.equal((readme.match(/\*\*갱신:\*\*/g) ?? []).length, 0, "harness sections do not duplicate update instructions");
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
