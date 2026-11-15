import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { CAPABILITIES, HARNESSES, loadHarness, tokensIn } from "../tools/lib/capabilities.mjs";
import { loadSyncConfig } from "../tools/lib/sync-config.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

for (const name of HARNESSES) {
  test(`${name}: defines every neutral capability and nothing else`, () => {
    const harness = loadHarness(ROOT, name);
    assert.equal(harness.harness, name);
    assert.deepEqual(Object.keys(harness.capabilities).sort(), [...CAPABILITIES].sort());
  });

  test(`${name}: every capability has a rendering and says whether it is native`, () => {
    const harness = loadHarness(ROOT, name);
    for (const [id, cap] of Object.entries(harness.capabilities)) {
      assert.ok(typeof cap.render === "string" && cap.render.trim() !== "", `${id} render`);
      assert.equal(typeof cap.native, "boolean", `${id} native`);
      assert.deepEqual(tokensIn(cap.render), [], `${id} render must not contain tokens`);
    }
  });

  test(`${name}: declares how it is packaged`, () => {
    const { package: pkg } = loadHarness(ROOT, name);
    assert.ok(typeof pkg.name === "string" && pkg.name !== "");
    assert.ok(pkg.manifest === null || /^\.[a-z-]+\/plugin\.json$/.test(pkg.manifest));
    assert.ok(Array.isArray(pkg.include) && pkg.include.includes("skills/**"));
    assert.equal(typeof pkg.hooks, "boolean");
  });

  test(`${name}: records the measured harness version`, () => {
    const harness = loadHarness(ROOT, name);
    assert.match(harness.measured?.version ?? "", /\d/);
    assert.match(harness.measured?.date ?? "", /^\d{4}-\d{2}-\d{2}$/);
  });
}

test("every token the substitutions emit is a neutral capability", () => {
  const { substitutions } = loadSyncConfig(`${ROOT}sync/`);
  const emitted = substitutions.rules.flatMap((rule) => tokensIn(rule.to));
  const unknown = emitted.filter((token) => !CAPABILITIES.includes(token));
  assert.deepEqual(unknown, []);
});

test("tokensIn finds {{capability}} tokens", () => {
  assert.deepEqual(tokensIn("use {{ask-user}} then {{todo}}, not {single}"), ["ask-user", "todo"]);
});
