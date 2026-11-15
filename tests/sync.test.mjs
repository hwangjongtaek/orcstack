import { test } from "node:test";
import assert from "node:assert/strict";
import { syncTrees } from "../tools/lib/sync.mjs";

const SHA = "a".repeat(40);
const tree = (obj) => new Map(Object.entries(obj).map(([path, body]) => [path, Buffer.from(body)]));
const text = (files, path) => files.get(path)?.toString("utf8");
const fork = (path) => ({ path, reason: "orcstack policy", since: SHA });

// A merge stub that succeeds when only one side changed each line and fails otherwise.
function lineMerge(ours, base, theirs) {
  const [o, b, t] = [ours, base, theirs].map((buf) => buf.toString("utf8").split("\n"));
  if (o.length !== b.length || t.length !== b.length) return { ok: false, text: Buffer.from(`<<<<<<< orcstack\n${ours}\n=======\n${theirs}\n>>>>>>> upstream`) };
  const out = [];
  for (let i = 0; i < b.length; i++) {
    if (o[i] !== b[i] && t[i] !== b[i] && o[i] !== t[i]) return { ok: false, text: Buffer.from(`<<<<<<< orcstack\n${ours}\n=======\n${theirs}\n>>>>>>> upstream`) };
    out.push(o[i] !== b[i] ? o[i] : t[i]);
  }
  return { ok: true, text: Buffer.from(out.join("\n")) };
}

const run = (base, theirs, ours, forks = []) => syncTrees({ base: tree(base), theirs: tree(theirs), ours: tree(ours), forks, merge: lineMerge });

test("an untouched file follows upstream", () => {
  const r = run({ "a.md": "v1" }, { "a.md": "v2" }, { "a.md": "v1" });
  assert.equal(text(r.files, "a.md"), "v2");
  assert.deepEqual(r.report.updated, ["a.md"]);
  assert.equal(r.ok, true);
});

test("a registered fork survives when upstream did not change", () => {
  const r = run({ "a.md": "v1" }, { "a.md": "v1" }, { "a.md": "mine" }, [fork("a.md")]);
  assert.equal(text(r.files, "a.md"), "mine");
  assert.deepEqual(r.report.forked, ["a.md"]);
  assert.equal(r.ok, true);
});

test("an unregistered divergence fails the sync", () => {
  const r = run({ "a.md": "v1" }, { "a.md": "v1" }, { "a.md": "mine" });
  assert.deepEqual(r.report.unregisteredForks, ["a.md"]);
  assert.equal(r.ok, false);
});

test("non-overlapping changes on both sides merge", () => {
  const r = run({ "a.md": "1\n2" }, { "a.md": "1\nUP" }, { "a.md": "MINE\n2" }, [fork("a.md")]);
  assert.equal(text(r.files, "a.md"), "MINE\nUP");
  assert.deepEqual(r.report.merged, ["a.md"]);
  assert.equal(r.ok, true);
});

test("overlapping changes conflict and keep markers", () => {
  const r = run({ "a.md": "1" }, { "a.md": "UP" }, { "a.md": "MINE" }, [fork("a.md")]);
  assert.match(text(r.files, "a.md"), /<<<<<<< orcstack/);
  assert.deepEqual(r.report.conflicts, ["a.md"]);
  assert.equal(r.ok, false);
});

test("upstream additions and deletions apply to untouched files", () => {
  const r = run({ "old.md": "x", "keep.md": "k" }, { "new.md": "n", "keep.md": "k" }, { "old.md": "x", "keep.md": "k" });
  assert.deepEqual([...r.files.keys()].sort(), ["keep.md", "new.md"]);
  assert.deepEqual(r.report.added, ["new.md"]);
  assert.deepEqual(r.report.deleted, ["old.md"]);
});

test("upstream deleting a forked file is a conflict", () => {
  const r = run({ "a.md": "v1" }, {}, { "a.md": "mine" }, [fork("a.md")]);
  assert.deepEqual(r.report.conflicts, ["a.md"]);
  assert.equal(r.ok, false);
});

test("orcstack-only files are left alone", () => {
  const r = run({}, {}, { "skills/work-brief/SKILL.md": "own" });
  assert.equal(text(r.files, "skills/work-brief/SKILL.md"), "own");
  assert.deepEqual(r.report.own, ["skills/work-brief/SKILL.md"]);
  assert.equal(r.ok, true);
});

test("an upstream file missing from src fails and points at exclude", () => {
  const r = run({ "a.md": "v1" }, { "a.md": "v1" }, {});
  assert.deepEqual(r.report.missing, ["a.md"]);
  assert.equal(r.ok, false);
});

test("a registered fork that no longer diverges is reported as stale", () => {
  const r = run({ "a.md": "v1" }, { "a.md": "v1" }, { "a.md": "v1" }, [fork("a.md")]);
  assert.deepEqual(r.report.staleForks, ["a.md"]);
});
