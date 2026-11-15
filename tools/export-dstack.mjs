#!/usr/bin/env node
import { createHash } from "node:crypto";
import { isUtf8 } from "node:buffer";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const substitutions = [
  ["hwangjongtaek/orcstack", "datamaker-kr/dstack"], ["orc-mode", "dama-mode"],
  ["orc-help", "dama-help"], ["orc-agent", "dama-agent"],
  ["ORCSTACK_AUTO_ACTIVATE", "DAMA_AUTO_ACTIVATE"],
  ["orcstack", "dstack"], ["ORCSTACK", "DSTACK"],
  ["Orc mode", "Dama mode"], ["Orc help", "Dama help"], ["Orc subagent", "Dama subagent"],
];
const translate = (text) => substitutions.reduce((value, [from, to]) => value.replaceAll(from, to), text);
const local = (path) => /^(harness\/hooks\/|src\/skills\/orc-mode\/SKILL\.md$|tests\/(selection|hooks|export-downstream)\.test\.mjs$|tests\/e2e\/|tests\/fixtures\/|tools\/(session|export-dstack|orcstack)\.mjs$)/.test(path);
const shared = (path) => /^(src\/|harness\/|tests\/|tools\/)/.test(path) && !local(path);
const contained = (parent, child) => {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith("../"));
};
const safe = (path) => {
  const absolute = process.platform === "darwin" ? resolve(path).replace(/^\/(tmp|var)(?=\/|$)/, "/private/$1") : resolve(path);
  for (let at = absolute; ; at = dirname(at)) {
    if (existsSync(at) && lstatSync(at).isSymbolicLink()) throw new Error(`Symlink is not allowed: ${at}`);
    if (dirname(at) === at) return absolute;
  }
};
const walk = (root, prefix) => {
  if (!existsSync(join(root, prefix))) return [];
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not allowed: ${path}`);
    return entry.isDirectory() ? walk(root, path) : [path];
  });
};

export function exportChanges({ root = ROOT, target, out, acknowledge = false }) {
  root = safe(root);
  target = safe(target);
  if (!existsSync(join(target, "package.json")) || JSON.parse(readFileSync(join(target, "package.json"), "utf8")).name !== "dstack") throw new Error("Target must be a dstack checkout.");
  if (contained(root, target) || contained(target, root)) throw new Error("Source and target must be separate directories.");
  if (!acknowledge) {
    out = safe(out);
    if ([root, target].some((path) => contained(path, out) || contained(out, path))) throw new Error("Output must be separate from source and target.");
    if (existsSync(out) && readdirSync(out).length) throw new Error("Output directory must be empty.");
  }
  const baselinePath = join(root, "sync/downstream.json");
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const entries = new Map(baseline.files.map((entry) => [entry.source, entry]));
  const candidates = new Set([...entries.keys(), ...["src", "harness", "tests", "tools"].flatMap((path) => walk(root, path))]);
  const files = [];
  const destinations = new Set();
  for (const source of [...candidates].filter(shared).sort()) {
    if (!contained(root, resolve(root, source))) throw new Error(`Unsafe source path: ${source}`);
    const path = translate(source);
    if (destinations.has(path)) throw new Error(`Duplicate downstream path: ${path}`);
    destinations.add(path);
    const previous = entries.get(source);
    if (!existsSync(join(root, source))) throw new Error(`Deletion needs a manual downstream review: ${source}`);
    const bytes = readFileSync(safe(join(root, source)));
    if (hash(bytes) === previous?.sourceHash) continue;
    if (!isUtf8(bytes)) throw new Error(`Shared changes must be UTF-8 text: ${source}`);
    if (!shared(path) || path.includes("..") || isAbsolute(path)) throw new Error(`Unsafe export path: ${path}`);
    const data = Buffer.from(translate(bytes.toString("utf8")));
    if (/orcstack|hwangjongtaek|side_cropped/i.test(`${path}\n${data.toString("utf8")}`)) throw new Error(`Personal reference remains in ${path}`);
    const targetPath = safe(join(target, path));
    const current = existsSync(targetPath) ? hash(readFileSync(targetPath)) : null;
    if (current !== (previous?.targetHash ?? null) && current !== hash(data)) throw new Error(`Downstream conflict: ${path}`);
    if (acknowledge && current !== hash(data)) throw new Error(`Downstream has not applied ${path}`);
    files.push({ source, path, data, before: current, sha256: hash(data), sourceHash: hash(bytes) });
  }
  if (acknowledge) {
    for (const file of files) entries.set(file.source, { source: file.source, target: file.path, sourceHash: file.sourceHash, targetHash: file.sha256 });
    baseline.files = [...entries.values()].sort((a, b) => a.source.localeCompare(b.source));
    writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
    return { acknowledged: files.length };
  }
  const manifest = { files: files.map(({ path, before, sha256 }) => ({ path, before, sha256 })), verification: ["node tools/build.mjs", "npm run check"], note: "Review replacement files, apply them to this checkout, rebuild dist, and run verification before committing." };
  mkdirSync(out, { recursive: true });
  for (const { path, data } of files) {
    mkdirSync(dirname(join(out, "files", path)), { recursive: true });
    writeFileSync(join(out, "files", path), data);
  }
  writeFileSync(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const arg = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  try {
    if (!arg("--target") || (!arg("--out") && !args.includes("--acknowledge"))) throw new Error("Usage: node tools/export-dstack.mjs --target <checkout> --out <empty-directory> | --target <checkout> --acknowledge");
    console.log(JSON.stringify(exportChanges({ target: arg("--target"), out: arg("--out"), acknowledge: args.includes("--acknowledge") }), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
