import { test } from "node:test";
import assert from "node:assert/strict";
import { derive, globToRegExp } from "../tools/lib/derive.mjs";

const config = {
  upstream: { exclude: ["skills/ketchup/**", "automations/**"] },
  rename: {
    rules: [
      { from: "poteto-mode", to: "orc-mode" },
      { from: "pstack", to: "orcstack" },
    ],
  },
  substitutions: { rules: [{ id: "ask-user", pattern: "`AskQuestion`", flags: "g", to: "{{ask-user}}" }] },
  denylist: {
    include: ["**/*.md"],
    terms: [
      { id: "cursor", pattern: "\\bCursor\\b", flags: "", kind: "rewrite" },
      { id: "pstack", pattern: "\\bpstack\\b", flags: "i", kind: "rewrite" },
    ],
  },
  attribution: { lines: ["Lauren Tan"] },
};

const text = (s) => Buffer.from(s, "utf8");
const files = (entries) => new Map(entries.map(([path, body]) => [path, typeof body === "string" ? text(body) : body]));
const read = (result, path) => result.files.get(path)?.toString("utf8");

test("excluded upstream paths do not reach the output", () => {
  const result = derive(files([["skills/ketchup/SKILL.md", "x"], ["automations/benny/a.md", "x"], ["skills/how/SKILL.md", "x"]]), config);
  assert.deepEqual([...result.files.keys()], ["skills/how/SKILL.md"]);
  assert.deepEqual(result.excluded, ["automations/benny/a.md", "skills/ketchup/SKILL.md"]);
});

test("rename applies on word boundaries to contents and paths", () => {
  const result = derive(files([["skills/poteto-mode/SKILL.md", "use poteto-mode in pstack, not upstack"]]), config);
  assert.equal(read(result, "skills/orc-mode/SKILL.md"), "use orc-mode in orcstack, not upstack");
});

test("attribution lines keep upstream names and are exempt from the denylist", () => {
  const body = "pstack by Lauren Tan\npstack runs in Cursor";
  const result = derive(files([["README.md", body]]), config);
  assert.equal(read(result, "README.md"), "pstack by Lauren Tan\norcstack runs in Cursor");
  assert.deepEqual(
    result.residue.map((r) => `${r.path}:${r.line}:${r.id}`),
    ["README.md:2:cursor"],
  );
});

test("substitutions apply to Markdown only; scripts are renamed but not substituted", () => {
  const result = derive(files([["a.md", "call `AskQuestion`"], ["s/run.ts", "call `AskQuestion` from pstack"]]), config);
  assert.equal(read(result, "a.md"), "call {{ask-user}}");
  assert.equal(read(result, "s/run.ts"), "call `AskQuestion` from orcstack");
  assert.deepEqual(result.substituted, { "ask-user": 1 });
});

test("the denylist scans only included files and reports path, line, rule, and kind", () => {
  const result = derive(files([["a.md", "ok\nmade for Cursor"], ["b.ts", "Cursor"]]), config);
  assert.deepEqual(result.residue, [{ path: "a.md", line: 2, id: "cursor", kind: "rewrite", text: "made for Cursor" }]);
});

test("binary files pass through unchanged", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x70, 0x73, 0x74, 0x61, 0x63, 0x6b]);
  const result = derive(files([["skills/poteto-mode/logo.png", png]]), config);
  assert.ok(result.files.get("skills/orc-mode/logo.png").equals(png));
});

test("derive is deterministic regardless of input order", () => {
  const entries = [["b.md", "pstack Cursor"], ["a.md", "poteto-mode"], ["c/d.md", "`AskQuestion`"]];
  const one = derive(files(entries), config);
  const two = derive(files([...entries].reverse()), config);
  assert.deepEqual([...one.files.keys()], [...two.files.keys()]);
  assert.deepEqual([...one.files.keys()], ["a.md", "b.md", "c/d.md"]);
  for (const [path, body] of one.files) assert.ok(body.equals(two.files.get(path)));
  assert.deepEqual(one.residue, two.residue);
});

test("globToRegExp handles **, *, and root-level matches", () => {
  assert.ok(globToRegExp("**/*.md").test("README.md"));
  assert.ok(globToRegExp("**/*.md").test("skills/a/SKILL.md"));
  assert.ok(!globToRegExp("**/*.md").test("skills/a/run.ts"));
  assert.ok(globToRegExp("skills/ketchup/**").test("skills/ketchup/SKILL.md"));
  assert.ok(!globToRegExp("skills/ketchup/**").test("skills/ketchup-video/SKILL.md"));
  assert.ok(globToRegExp("plugin.json").test("plugin.json"));
  assert.ok(!globToRegExp("plugin.json").test("x/plugin.json"));
});
