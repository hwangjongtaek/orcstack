#!/usr/bin/env node
// Usage:
//   node tools/sync.mjs --upstream <local cursor/plugins clone> --init          import the pinned commit into an empty src/
//   node tools/sync.mjs --upstream <local cursor/plugins clone> [--to <ref>]    three-way sync src/ to a new upstream commit
//   ... --to <pin> --base-rules <dir | orcstack git ref>                            re-derive src/ after a change to sync/ rules:
//       base is derived with the old rules, theirs with the current ones, so forks merge the rule change like an upstream change.
//   ... --to <ref> --resolved                                                     after a failed sync: once the conflicts in src/
//       are fixed and the forks registered, check src/ against <ref> alone (base = theirs) and move the pin.
// Options: --root <orcstack root> (default: this repository), --summary <file> (Markdown report for the sync PR).
// Exit code 0 means the pin moved (or --init succeeded). 1 means conflicts, unregistered forks, or missing files; the pin stays.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { derive, scanResidue } from "./lib/derive.mjs";
import { syncTrees } from "./lib/sync.mjs";
import { SYNC_FILES, loadSyncConfig } from "./lib/sync-config.mjs";
import { readTree, writeTree } from "./derive.mjs";

const git = (repo, ...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 1 << 30 }).trim();

function readCommit(repo, commit, subdir) {
  const dir = mkdtempSync(join(tmpdir(), "orcstack-upstream-"));
  try {
    const tar = execFileSync("git", ["-C", repo, "archive", "--format=tar", commit, subdir], { maxBuffer: 1 << 30 });
    execFileSync("tar", ["-x", "-C", dir], { input: tar });
    return readTree(join(dir, subdir));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function gitMergeFile(ours, base, theirs) {
  const dir = mkdtempSync(join(tmpdir(), "orcstack-merge-"));
  try {
    const paths = ["ours", "base", "theirs"].map((name) => join(dir, name));
    [ours, base, theirs].forEach((bytes, i) => writeFileSync(paths[i], bytes));
    const result = spawnSync("git", ["merge-file", "-p", "-L", "orcstack", "-L", "base", "-L", "upstream", ...paths], { maxBuffer: 1 << 30 });
    if (result.status < 0 || result.status === null || result.status > 127) throw new Error(`git merge-file failed: ${result.stderr}`);
    return { ok: result.status === 0, text: result.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Old sync rules from a directory, or from sync/ at a git ref of the orcstack repository.
function loadBaseRules(root, from) {
  if (existsSync(from)) return loadSyncConfig(from);
  const dir = mkdtempSync(join(tmpdir(), "orcstack-rules-"));
  try {
    for (const name of SYNC_FILES) writeFileSync(join(dir, `${name}.json`), git(root, "show", `${from}:sync/${name}.json`));
    return loadSyncConfig(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const skillDirs = (tree) => new Set([...tree.keys()].map((p) => p.match(/^skills\/[^/]+\//)?.[0]).filter(Boolean));
const MARKER = /^(<<<<<<< orcstack|>>>>>>> upstream)$/m;

function summary(from, to, result, residue, base, theirs) {
  const section = (title, list) => (list.length ? [`### ${title} (${list.length})`, "", ...list.map((p) => `- \`${p}\``), ""] : []);
  const r = result.report;
  const [before, after] = [skillDirs(base), skillDirs(theirs)];
  return [
    `## upstream sync ${from.slice(0, 7)} → ${to.slice(0, 7)}`,
    "",
    result.ok ? "판정 통과. pin을 갱신했다." : "**판정 실패.** pin을 갱신하지 않았다. 아래 항목을 해결한다.",
    "",
    ...section("충돌 마커가 남은 파일", r.unresolved ?? []),
    ...section("충돌", r.conflicts),
    ...section("forks.json에 없는 분기", r.unregisteredForks),
    ...section("src/에 없는 upstream 파일 (빼려면 exclude에 추가)", r.missing),
    ...section("신규 skill", [...after].filter((d) => !before.has(d)).sort()),
    ...section("사라진 skill", [...before].filter((d) => !after.has(d)).sort()),
    ...section("병합됨", r.merged),
    ...section("추가", r.added),
    ...section("갱신", r.updated),
    ...section("삭제", r.deleted),
    ...section("더는 분기하지 않는 fork 항목", r.staleForks),
    ...(residue.length
      ? [`### src/ denylist 잔존 (${residue.length})`, "", ...residue.map((x) => `- \`${x.path}:${x.line}\` ${x.id} (${x.kind}): ${x.text}`), ""]
      : ["### src/ denylist 잔존: 없음", ""]),
  ].join("\n");
}

function main(argv) {
  const arg = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const root = arg("--root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
  const upstreamRepo = arg("--upstream");
  if (!upstreamRepo) {
    console.error("usage: node tools/sync.mjs --upstream <local cursor/plugins clone> [--init | --to <ref> [--base-rules <dir|ref> | --resolved]] [--root <dir>] [--summary <file>]");
    process.exit(2);
  }
  const config = loadSyncConfig(join(root, "sync"));
  const { subdir, pin } = config.upstream;
  const srcDir = join(root, "src");

  if (argv.includes("--init")) {
    if (existsSync(srcDir) && readTree(srcDir).size > 0) {
      console.error("--init needs an empty src/");
      process.exit(2);
    }
    const derived = derive(readCommit(upstreamRepo, pin.commit, subdir), config);
    writeTree(srcDir, derived.files);
    console.log(JSON.stringify({ init: pin.commit, files: derived.files.size, residue: derived.residue.length }, null, 2));
    return;
  }

  const to = git(upstreamRepo, "rev-parse", `${arg("--to") ?? config.upstream.ref}^{commit}`);
  const newTree = readCommit(upstreamRepo, to, subdir);
  const resolved = argv.includes("--resolved");
  const baseRules = arg("--base-rules") ? loadBaseRules(root, arg("--base-rules")) : config;
  const theirs = derive(newTree, config);
  const base = resolved ? theirs : derive(readCommit(upstreamRepo, pin.commit, subdir), baseRules);
  const ours = existsSync(srcDir) ? readTree(srcDir) : new Map();
  const result = syncTrees({ base: base.files, theirs: theirs.files, ours, forks: config.forks.forks, merge: gitMergeFile });
  if (resolved) {
    result.report.unresolved = [...result.files].filter(([, bytes]) => MARKER.test(bytes.toString("utf8"))).map(([path]) => path).sort();
    if (result.report.unresolved.length) result.ok = false;
  }
  writeTree(srcDir, result.files);

  if (result.ok) {
    const pinFile = join(root, "sync", "upstream.json");
    const upstreamJson = JSON.parse(readFileSync(pinFile, "utf8"));
    const manifest = newTree.get("plugin.json");
    upstreamJson.pin = {
      commit: to,
      version: manifest ? JSON.parse(manifest.toString("utf8")).version : pin.version,
      date: git(upstreamRepo, "show", "-s", "--format=%cs", to),
    };
    writeFileSync(pinFile, `${JSON.stringify(upstreamJson, null, 2)}\n`);
  }
  const report = { from: pin.commit, to, ok: result.ok, ...result.report, residue: theirs.residue.length };
  console.log(JSON.stringify(report, null, 2));
  if (arg("--summary")) writeFileSync(arg("--summary"), summary(pin.commit, to, result, scanResidue(result.files, config), base.files, theirs.files));
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
