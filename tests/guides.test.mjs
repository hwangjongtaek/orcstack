// M5-8: the human guides name skills and playbooks people will try to call. A renamed or removed one must fail here,
// not in a person's session.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const at = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const GUIDE = "docs/guides/using-orcstack.md";
const skills = new Set(readdirSync(at("src/skills")));
const playbooks = new Set(readdirSync(at("src/skills/orc-mode/playbooks")).map((f) => f.replace(/\.md$/, "")));

// Rows of every table whose first header cell is `skill` or `playbook`: the first cell of each row is a name in backticks.
function tableNames(text, header) {
  const names = [];
  let inTable = false;
  for (const line of text.split("\n")) {
    if (!line.startsWith("|")) inTable = false;
    else if (new RegExp(`^\\| ${header} \\|`).test(line)) inTable = true;
    else if (inTable && !/^\|[-| ]+\|$/.test(line)) names.push(...[...line.split("|")[1].matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]));
  }
  return names;
}

test("the using-orcstack guide exists and README links it", () => {
  assert.ok(existsSync(at(GUIDE)));
  assert.match(readFileSync(at("README.md"), "utf8"), /\(docs\/guides\/using-orcstack\.md\)/);
});

test("skills and playbooks the guide names exist", () => {
  const text = existsSync(at(GUIDE)) ? readFileSync(at(GUIDE), "utf8") : "";
  const named = { skill: tableNames(text, "skill"), playbook: tableNames(text, "playbook") };
  assert.ok(named.skill.length >= 10 && named.playbook.length >= 5, JSON.stringify(named));
  assert.deepEqual(named.skill.filter((n) => !skills.has(n)), []);
  assert.deepEqual(named.playbook.filter((n) => !playbooks.has(n)), []);
});
