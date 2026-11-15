import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { exportChanges } from "../tools/export-dstack.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const write = (path, data) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, data); };
function fixture() {
  const at = mkdtempSync(join(tmpdir(), "workflow-export-"));
  const root = join(at, "personal");
  const target = join(at, "company");
  const out = join(at, "bundle");
  write(join(root, "src/shared.mjs"), 'console.log("orcstack");\n');
  write(join(target, "src/shared.mjs"), 'console.log("dstack");\n');
  write(join(target, "package.json"), '{"name":"dstack"}');
  write(join(target, "README.md"), "company document");
  write(join(root, "sync/downstream.json"), JSON.stringify({ files: [{ source: "src/shared.mjs", target: "src/shared.mjs", sourceHash: hash(readFileSync(join(root, "src/shared.mjs"))), targetHash: hash(readFileSync(join(target, "src/shared.mjs"))) }] }));
  return { root, target, out };
}

test("exports only shared changes and contains no personal references", () => {
  const paths = fixture();
  write(join(paths.root, "src/shared.mjs"), 'console.log("orcstack update");\n');
  write(join(paths.root, "assets/side_cropped.png"), "image");
  write(join(paths.root, "src/skills/orc-mode/SKILL.md"), "local selection");
  const manifest = exportChanges(paths);
  assert.deepEqual(manifest.files.map((file) => file.path), ["src/shared.mjs"]);
  assert.equal(readFileSync(join(paths.out, "files/src/shared.mjs"), "utf8"), 'console.log("dstack update");\n');
  assert.equal(readFileSync(join(paths.target, "src/shared.mjs"), "utf8"), 'console.log("dstack");\n');
  assert.equal(readFileSync(join(paths.target, "README.md"), "utf8"), "company document");
  assert.doesNotMatch(readFileSync(join(paths.out, "manifest.json"), "utf8"), /orcstack/i);
  assert.equal(existsSync(join(paths.out, "files/assets")), false);
});

test("conflicting downstream changes fail before output is written", () => {
  const paths = fixture();
  write(join(paths.root, "src/shared.mjs"), "changed");
  write(join(paths.target, "src/shared.mjs"), "company change");
  assert.throws(() => exportChanges(paths), /Downstream conflict/);
  assert.equal(existsSync(paths.out), false);
});

test("untranslated personal text fails before output is written", () => {
  const paths = fixture();
  write(join(paths.root, "src/shared.mjs"), "OrCsTaCk");
  assert.throws(() => exportChanges(paths), /Personal reference remains/);
  assert.equal(existsSync(paths.out), false);
});

test("acknowledgment requires applied bytes and allows a later update", () => {
  const paths = fixture();
  write(join(paths.root, "src/shared.mjs"), "first update");
  assert.throws(() => exportChanges({ ...paths, acknowledge: true }), /has not applied/);
  write(join(paths.target, "src/shared.mjs"), "first update");
  assert.deepEqual(exportChanges({ ...paths, acknowledge: true }), { acknowledged: 1 });
  write(join(paths.root, "src/shared.mjs"), "second update");
  assert.equal(exportChanges(paths).files.length, 1);
});

test("unchanged export is empty, nonempty outputs and overlapping paths are rejected", () => {
  const paths = fixture();
  assert.equal(exportChanges(paths).files.length, 0);
  assert.throws(() => exportChanges(paths), /must be empty/);
  assert.throws(() => exportChanges({ ...paths, out: join(paths.target, "output") }), /separate/);
  assert.deepEqual(readdirSync(paths.out), ["manifest.json"]);
});

test("symlinked output or source paths are rejected", () => {
  const paths = fixture();
  symlinkSync(paths.target, paths.out);
  assert.throws(() => exportChanges(paths), /Symlink/);
});

test("translated path collisions fail before writing any output", () => {
  const paths = fixture();
  write(join(paths.root, "src/orcstack.mjs"), "personal implementation");
  write(join(paths.root, "src/dstack.mjs"), "company implementation");
  assert.throws(() => exportChanges(paths), /Duplicate downstream path/);
  assert.equal(existsSync(paths.out), false);
});

test("binary shared changes are rejected instead of converted", () => {
  const paths = fixture();
  write(join(paths.root, "src/binary.bin"), Buffer.from([0xff, 0xfe, 0x00]));
  assert.throws(() => exportChanges(paths), /must be UTF-8 text/);
  assert.equal(existsSync(paths.out), false);
});
