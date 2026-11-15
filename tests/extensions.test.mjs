// Project extension points (ADR-0004): .orcstack/config.json turns orcstack playbooks and skills off, extends, replaces, or adds.
// Guards SSOT C7: project settings survive orcstack updates, and off items are not routed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../", import.meta.url));
const SCRIPTS = join(REPO, "src", "skills", "adopt-orcstack", "scripts");
const EXTENSIONS = join(SCRIPTS, "extensions.mjs");
const ADOPT = join(SCRIPTS, "adopt.mjs");
const BUNDLED_PLAYBOOKS = join(REPO, "src", "skills", "orc-mode", "playbooks");

const VALID = {
  version: 1,
  playbooks: {
    "visual-parity": "off",
    "bug-fix": { extend: "playbooks/bug-fix.md" },
    feature: { replace: "playbooks/feature.md" },
    "data-migration": { add: "playbooks/data-migration.md", when: "A schema or data migration across environments." },
  },
  skills: { statechart: "off", tdd: { extend: "skills/tdd.md" } },
};
const EXTENSION_FILES = ["playbooks/bug-fix.md", "playbooks/feature.md", "playbooks/data-migration.md", "skills/tdd.md"];

function project(config, files = EXTENSION_FILES) {
  const root = mkdtempSync(join(tmpdir(), "orcstack-ext-"));
  for (const path of files) {
    mkdirSync(dirname(join(root, ".orcstack", path)), { recursive: true });
    writeFileSync(join(root, ".orcstack", path), `# ${path}\n`);
  }
  if (config !== undefined) writeFileSync(join(root, ".orcstack", "config.json"), typeof config === "string" ? config : JSON.stringify(config));
  return root;
}

function resolve(root) {
  const result = spawnSync(process.execPath, [EXTENSIONS, "resolve", "--root", root], { encoding: "utf8" });
  return { ...result, json: JSON.parse(result.stdout) };
}

const errorsFor = (config, files) => resolve(project(config, files)).json.errors.join("\n");

test("a repository without .orcstack/config.json resolves to no changes", () => {
  const { status, json } = resolve(mkdtempSync(join(tmpdir(), "orcstack-ext-")));
  assert.equal(status, 0);
  assert.deepEqual(json.errors, []);
  assert.deepEqual(json.playbooks, { off: [], extend: {}, replace: {}, add: {} });
  assert.deepEqual(json.skills, { off: [], extend: {} });
});

test("resolve lists off items, project files for extend and replace, and added playbooks with their when", () => {
  const root = project(VALID);
  const { status, json } = resolve(root);
  assert.equal(status, 0, json.errors.join("\n"));
  assert.deepEqual(json.errors, []);
  assert.deepEqual(json.playbooks.off, ["visual-parity"]);
  assert.deepEqual(json.skills.off, ["statechart"]);
  assert.equal(json.playbooks.extend["bug-fix"], join(root, ".orcstack", "playbooks", "bug-fix.md"));
  assert.equal(json.playbooks.replace.feature, join(root, ".orcstack", "playbooks", "feature.md"));
  assert.deepEqual(json.playbooks.add["data-migration"], { file: join(root, ".orcstack", "playbooks", "data-migration.md"), when: VALID.playbooks["data-migration"].when });
  assert.equal(json.skills.extend.tdd, join(root, ".orcstack", "skills", "tdd.md"));
});

test("resolve knows the bundled playbooks and skills from the plugin layout", () => {
  for (const name of ["bug-fix", "opening-a-pr", "visual-parity"]) assert.ok(existsSync(join(BUNDLED_PLAYBOOKS, `${name}.md`)), name);
  assert.match(errorsFor({ version: 1, playbooks: { "bug-fixx": "off" } }), /bug-fixx.*not a orcstack playbook/);
  assert.match(errorsFor({ version: 1, skills: { tddd: "off" } }), /tddd.*not a orcstack skill/);
});

const INVALID = [
  ["bad JSON", "{ nope", /not valid JSON/],
  ["missing version", { playbooks: {} }, /version must be 1/],
  ["unknown top-level key", { version: 1, rules: {} }, /unknown key "rules"/],
  ["orc-mode off", { version: 1, skills: { "orc-mode": "off" } }, /orc-mode.*cannot be turned off or extended/],
  ["adopt-orcstack extended", { version: 1, skills: { "adopt-orcstack": { extend: "skills/tdd.md" } } }, /adopt-orcstack.*cannot be turned off or extended/],
  ["opening-a-pr off", { version: 1, playbooks: { "opening-a-pr": "off" } }, /opening-a-pr.*cannot be turned off/],
  ["missing file", { version: 1, playbooks: { "bug-fix": { extend: "playbooks/nope.md" } } }, /playbooks\/nope\.md.*does not exist/],
  ["path outside .orcstack", { version: 1, playbooks: { "bug-fix": { extend: "../AGENTS.md" } } }, /\.\.\/AGENTS\.md.*inside \.orcstack\//],
  ["absolute path", { version: 1, playbooks: { "bug-fix": { extend: "/etc/hosts" } } }, /inside \.orcstack\//],
  ["not markdown", { version: 1, playbooks: { "bug-fix": { extend: "playbooks" } } }, /\.md file/],
  ["add collides with a bundled playbook", { version: 1, playbooks: { "bug-fix": { add: "playbooks/bug-fix.md", when: "x" } } }, /bug-fix.*already a orcstack playbook.*extend or replace/],
  ["add without when", { version: 1, playbooks: { "data-migration": { add: "playbooks/data-migration.md" } } }, /data-migration.*needs "when"/],
  ["two actions", { version: 1, playbooks: { "bug-fix": { extend: "playbooks/bug-fix.md", replace: "playbooks/feature.md" } } }, /bug-fix.*exactly one of/],
  ["skill replace", { version: 1, skills: { tdd: { replace: "skills/tdd.md" } } }, /tdd.*skills take "off" or extend/],
  ["bad name", { version: 1, playbooks: { "Data Migration": { add: "playbooks/data-migration.md", when: "x" } } }, /Data Migration.*kebab-case/],
  ["unknown value", { version: 1, playbooks: { "bug-fix": "disabled" } }, /bug-fix.*"off" or an object/],
];

for (const [name, config, pattern] of INVALID) {
  test(`config error: ${name}`, () => {
    const result = resolve(project(config));
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.json.errors.join("\n"), pattern);
  });
}

function adopt(root, ...args) {
  return spawnSync(process.execPath, [ADOPT, ...args, "--root", root], { encoding: "utf8" });
}
const guard = (root) => spawnSync(process.execPath, [join(root, ".orcstack", "check-no-sdd.mjs")], { cwd: root, encoding: "utf8" });

test("the installed guard fails on a config error and passes on a valid config", () => {
  const root = project(VALID);
  assert.equal(adopt(root, "guard").status, 0);
  assert.ok(existsSync(join(root, ".orcstack", "catalog.json")));
  assert.equal(guard(root).status, 0, guard(root).stdout);
  writeFileSync(join(root, ".orcstack", "config.json"), JSON.stringify({ version: 1, playbooks: { "bug-fixx": "off" } }));
  const red = guard(root);
  assert.equal(red.status, 1);
  assert.match(red.stdout, /\.orcstack\/config\.json.*bug-fixx/);
});

test("scaffold writes an empty config and a README once, and rerunning scaffold and guard keeps project files", () => {
  const root = mkdtempSync(join(tmpdir(), "orcstack-ext-"));
  assert.equal(adopt(root, "scaffold", "--milestone", "M7").status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(root, ".orcstack", "config.json"), "utf8")), { version: 1, playbooks: {}, skills: {} });
  assert.match(readFileSync(join(root, ".orcstack", "README.md"), "utf8"), /config\.json/);

  const custom = JSON.stringify(VALID, null, 2);
  writeFileSync(join(root, ".orcstack", "config.json"), custom);
  writeFileSync(join(root, ".orcstack", "README.md"), "# ours\n");
  for (const path of EXTENSION_FILES) {
    mkdirSync(dirname(join(root, ".orcstack", path)), { recursive: true });
    writeFileSync(join(root, ".orcstack", path), `# project ${path}\n`);
  }
  adopt(root, "scaffold", "--milestone", "M7");
  adopt(root, "guard");
  adopt(root, "guard");
  assert.equal(readFileSync(join(root, ".orcstack", "config.json"), "utf8"), custom);
  assert.equal(readFileSync(join(root, ".orcstack", "README.md"), "utf8"), "# ours\n");
  for (const path of EXTENSION_FILES) assert.equal(readFileSync(join(root, ".orcstack", path), "utf8"), `# project ${path}\n`);
  assert.equal(guard(root).status, 0, guard(root).stdout);
});
