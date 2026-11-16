// Guards SSOT C6: dist/ always equals the build of src/ and harness/ (build --check), and C2 in the manifests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ATTRIBUTION, buildHarness } from "../tools/lib/build.mjs";
import { CAPABILITIES, HARNESSES, loadHarness } from "../tools/lib/capabilities.mjs";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const tree = (obj) => new Map(Object.entries(obj).map(([path, body]) => [path, Buffer.from(body)]));
const text = (files, path) => files.get(path)?.toString("utf8");
const harness = (name) => loadHarness(REPO, name);
const opts = { version: "1.2.3", hooks: tree({ "hooks.json": "{}" }) };

test("tokens in Markdown render per harness; other files are copied as is", () => {
  const src = tree({ "skills/a/SKILL.md": "Spawn with {{spawn-subagent}}.", "skills/a/run.ts": "// {{spawn-subagent}}" });
  const claude = buildHarness(src, harness("claude-code"), opts);
  const codex = buildHarness(src, harness("codex"), opts);
  assert.equal(text(claude, "skills/a/SKILL.md"), "Spawn with `Agent`.");
  assert.equal(text(codex, "skills/a/SKILL.md"), "Spawn with `spawn_agent`.");
  assert.equal(text(claude, "skills/a/run.ts"), "// {{spawn-subagent}}");
});

test("setup skill renders a harness-local model sheet without foreign defaults", () => {
  const source = readFileSync(join(REPO, "src/skills/setup-orcstack/SKILL.md"), "utf8");
  const sheets = new Map([
    ["claude-code", "~/.claude/orcstack-models.md"],
    ["codex", "~/.codex/orcstack-models.md"],
    ["omp", "~/.omp/agent/orcstack-models.md"],
  ]);
  assert.equal(new Set(sheets.values()).size, sheets.size);
  for (const [name, sheet] of sheets) {
    const files = buildHarness(tree({ "skills/setup-orcstack/SKILL.md": source }), harness(name), opts);
    const rendered = text(files, "skills/setup-orcstack/SKILL.md");
    assert.ok(rendered.includes(sheet), `${name} setup must use ${sheet}`);
    assert.match(rendered, /# defaults: 2/);
    assert.match(rendered, /unlimited.*max reasoning[\s\S]*large.*xhigh reasoning[\s\S]*medium.*high reasoning[\s\S]*small.*medium reasoning/);
    assert.doesNotMatch(rendered, /^how explorer:|^how explainer:|^why investigators:|^why synthesizer:/m);
    assert.doesNotMatch(rendered, /claude-(?:opus|fable|sonnet|haiku)-\d|gemini-\d|gpt-\d/);
  }
});

test("an unknown token fails with its location", () => {
  const src = tree({ "skills/a/SKILL.md": "ok\nuse {{teleport}}" });
  assert.throws(() => buildHarness(src, harness("claude-code"), opts), /skills\/a\/SKILL\.md:2: unknown capability \{\{teleport\}\}/);
});

test("only the harness's include paths reach dist", () => {
  const src = tree({ "skills/a/SKILL.md": "s", "agents/x.md": "a", "README.md": "r", "docs/guide/01.md": "g" });
  assert.deepEqual([...buildHarness(src, harness("codex"), opts).keys()].filter((p) => !p.startsWith(".") && !p.startsWith("hooks/")), ["skills/a/SKILL.md"]);
  assert.ok(buildHarness(src, harness("claude-code"), opts).has("agents/x.md"));
});

test("manifests carry the VERSION and the upstream attribution", () => {
  for (const name of HARNESSES) {
    const pkg = harness(name).package;
    if (!pkg.manifest) continue;
    const manifest = JSON.parse(text(buildHarness(new Map(), harness(name), opts), pkg.manifest));
    assert.equal(manifest.name, pkg.name);
    assert.equal(manifest.version, "1.2.3");
    assert.ok(manifest.description.endsWith(ATTRIBUTION), name);
  }
});

test("hooks ship only to harnesses that run them", () => {
  assert.ok(buildHarness(new Map(), harness("claude-code"), opts).has("hooks/hooks.json"));
  assert.ok(buildHarness(new Map(), harness("codex"), opts).has("hooks/hooks.json"));
  assert.ok(!buildHarness(new Map(), harness("omp"), opts).has("hooks/hooks.json"));
  assert.ok(!buildHarness(new Map(), harness("opencode"), opts).has("hooks/hooks.json"));
});

test("the Codex manifest points at hooks only when a hook file exists", () => {
  const read = (hooks) => JSON.parse(text(buildHarness(new Map(), harness("codex"), { version: "1.0.0", hooks }), ".codex-plugin/plugin.json"));
  assert.equal(read(tree({ "hooks.json": "{}" })).hooks, "./hooks/hooks.json");
  assert.equal(read(new Map()).hooks, undefined);
});

test("every capability renders in every harness", () => {
  const src = tree({ "skills/all/SKILL.md": CAPABILITIES.map((c) => `{{${c}}}`).join("\n") });
  for (const name of HARNESSES) {
    const out = text(buildHarness(src, harness(name), opts), "skills/all/SKILL.md");
    assert.doesNotMatch(out, /\{\{/, name);
  }
});

test("build --check fails when dist/ is stale and passes after a build", () => {
  const root = mkdtempSync(join(tmpdir(), "orcstack-build-"));
  for (const dir of ["harness", "sync"]) cpSync(join(REPO, dir), join(root, dir), { recursive: true });
  writeFileSync(join(root, "VERSION"), "0.0.1\n");
  mkdirSync(join(root, "src", "skills", "a"), { recursive: true });
  writeFileSync(join(root, "src", "skills", "a", "SKILL.md"), "ask with {{ask-user}}\n");
  const cli = (...args) => spawnSync(process.execPath, [join(REPO, "tools", "build.mjs"), "--root", root, ...args], { encoding: "utf8" });

  assert.equal(cli("--check").status, 1);
  assert.equal(cli().status, 0);
  assert.equal(cli("--check").status, 0);
  assert.equal(readFileSync(join(root, "dist", "omp", "skills", "a", "SKILL.md"), "utf8"), "ask with the `ask` tool\n");
  writeFileSync(join(root, "dist", "omp", "skills", "a", "SKILL.md"), "hand edit\n");
  const stale = cli("--check");
  assert.equal(stale.status, 1);
  assert.match(stale.stdout + stale.stderr, /dist\/omp\/skills\/a\/SKILL\.md/);
});

// Renders are bare nouns; the source sentence carries the article (ADR-0003). A render that brings its own
// article or "tool" doubles them: "Open a a checklist", "If the the `Agent` tool tool rejects".
test("rendered dist prose never doubles an article or the word tool", () => {
  const DOUBLED = /\b(a|an|the) (a|an|the)\b|\btool`? tool\b/gi;
  const problems = [];
  for (const harness of HARNESSES) {
    const dir = join(REPO, "dist", harness);
    for (const path of readdirSync(dir, { recursive: true })) {
      if (!String(path).endsWith(".md")) continue;
      readFileSync(join(dir, path), "utf8").split("\n").forEach((line, i) => {
        for (const [hit] of line.matchAll(DOUBLED)) problems.push(`${harness}/${path}:${i + 1}: ${hit}`);
      });
    }
  }
  assert.deepEqual(problems, []);
});
