// Guards SSOT C5: no SDD, Spec Kit, or Superpowers artifacts appear in a orcstack-governed repository.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findFrameworkArtifacts } from "../tools/lib/no-sdd.mjs";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const find = (files) => findFrameworkArtifacts(new Map(Object.entries(files).map(([p, body]) => [p, Buffer.from(body)])));
const signals = (files) => find(files).map((a) => `${a.framework}:${a.path}`);

test("SDD documents are found by their plural file names", () => {
  assert.deepEqual(signals({ "specs/login/requirements.md": "", "specs/login/specs.md": "", "specs/login/plans.md": "" }), [
    "sdd:specs/login/plans.md",
    "sdd:specs/login/requirements.md",
    "sdd:specs/login/specs.md",
  ]);
});

test("Spec Kit is found by .specify/, numbered spec folders, and command files", () => {
  assert.deepEqual(
    signals({
      ".specify/memory/constitution.md": "",
      "specs/001-login/spec.md": "",
      ".claude/skills/speckit-plan/SKILL.md": "",
      ".agents/skills/speckit-tasks/SKILL.md": "",
      ".opencode/commands/speckit.plan.md": "",
      ".omp/commands/speckit.plan.md": "",
    }),
    [
      "speckit:.agents/skills/speckit-tasks/SKILL.md",
      "speckit:.claude/skills/speckit-plan/SKILL.md",
      "speckit:.omp/commands/speckit.plan.md",
      "speckit:.opencode/commands/speckit.plan.md",
      "speckit:.specify/memory/constitution.md",
      "speckit:specs/001-login/spec.md",
    ],
  );
});

test("Superpowers design and plan documents are found", () => {
  assert.deepEqual(signals({ "docs/superpowers/specs/2026-11-01-x-design.md": "", "docs/superpowers/plans/2026-11-01-x.md": "" }), [
    "superpowers:docs/superpowers/plans/2026-11-01-x.md",
    "superpowers:docs/superpowers/specs/2026-11-01-x-design.md",
  ]);
});

test("enabled framework plugins in project settings are found", () => {
  const settings = JSON.stringify({ enabledPlugins: { "sdd-helper@synapse-marketplace": true, "superpowers@claude-plugins-official": true, "tmux-orchestrator@orchwang-marketplace": false } });
  assert.deepEqual(signals({ ".claude/settings.json": settings }), ["sdd:.claude/settings.json", "superpowers:.claude/settings.json"]);
  assert.deepEqual(signals({ "opencode.json": JSON.stringify({ plugin: ["superpowers@git+https://github.com/obra/superpowers.git"] }) }), ["superpowers:opencode.json"]);
});

test("frozen archives and unrelated files are allowed", () => {
  assert.deepEqual(signals({ "docs/archive/sdd/specs/a/requirements.md": "", "docs/spikes/framework-signals.md": "specs/x/requirements.md", "specs/README.md": "" }), []);
});

test("the CLI passes on this repository and fails when an SDD document is added", () => {
  const clean = spawnSync(process.execPath, [join(REPO, "tools", "check-no-sdd.mjs")], { encoding: "utf8" });
  assert.equal(clean.status, 0, clean.stdout);

  const root = mkdtempSync(join(tmpdir(), "orcstack-nosdd-"));
  const path = join(root, "specs", "login", "requirements.md");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "# requirements\n");
  const dirty = spawnSync(process.execPath, [join(REPO, "tools", "check-no-sdd.mjs"), "--root", root], { encoding: "utf8" });
  assert.equal(dirty.status, 1);
  assert.match(dirty.stdout, /sdd\s+specs\/login\/requirements\.md/);
});
