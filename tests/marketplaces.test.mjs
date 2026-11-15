// The repository is a marketplace for each harness that reads one: every entry must point at a built dist with a
// matching manifest, so `marketplace add` + `plugin add` installs what CI built.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const json = (path) => JSON.parse(readFileSync(join(REPO, path), "utf8"));

test("Claude Code marketplace: each entry is a built plugin with the same name", () => {
  const market = json(".claude-plugin/marketplace.json");
  assert.equal(market.name, "orcstack");
  for (const plugin of market.plugins) {
    const manifest = json(join(plugin.source, ".claude-plugin", "plugin.json"));
    assert.equal(manifest.name, plugin.name);
    assert.ok(existsSync(join(REPO, plugin.source, "skills", "orc-mode", "SKILL.md")), plugin.source);
  }
});

test("Codex marketplace: the orcstack entry is a local path to dist/codex, offered to Codex", () => {
  const market = json(".agents/plugins/marketplace.json");
  assert.equal(market.name, "orcstack");
  const entry = market.plugins.find((p) => p.name === "orcstack");
  assert.deepEqual(entry.source, { source: "local", path: "./dist/codex" });
  assert.equal(entry.policy.installation, "AVAILABLE");
  assert.ok(entry.policy.products.includes("CODEX"));
  const manifest = json("dist/codex/.codex-plugin/plugin.json");
  assert.equal(manifest.name, "orcstack");
  assert.ok(existsSync(join(REPO, "dist/codex", manifest.skills, "orc-mode", "SKILL.md")));
  if (manifest.hooks) assert.ok(existsSync(join(REPO, "dist/codex", manifest.hooks)), manifest.hooks);
});

test("Claude Code marketplace also carries the oh-my-pi build, which omp reads in the same format", () => {
  const sources = Object.fromEntries(json(".claude-plugin/marketplace.json").plugins.map((p) => [p.name, p.source]));
  assert.equal(sources.orcstack, "./dist/claude-code");
  assert.equal(sources["orcstack-omp"], "./dist/omp");
  assert.match(readFileSync(join(REPO, "dist/omp/skills/orc-mode/SKILL.md"), "utf8"), /`task`/, "omp tool names are rendered");
});
