#!/usr/bin/env node
// The weekly upstream sync job (M5-1), minus git and GitHub: .github/workflows/sync.yml commits, pushes, and opens the PR.
// Syncs src/ to the upstream ref in sync/upstream.json, rebuilds dist/ when the sync passes, and writes the PR body.
// A person reviews and merges the PR.
// Usage: node tools/sync-pr.mjs --upstream <cursor/plugins clone> --out <dir> [--to <ref>] [--root <orcstack root>]
// Prints one JSON object: {action: "none" | "open", ok, from, to, branch, title, draft, body}. Exit 0 unless a tool breaks.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOOLS = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const root = arg("--root") ?? join(TOOLS, "..");
const upstream = arg("--upstream");
const out = arg("--out");
if (!upstream || !out) {
  console.error("usage: node tools/sync-pr.mjs --upstream <cursor/plugins clone> --out <dir> [--to <ref>] [--root <orcstack root>]");
  process.exit(2);
}

const pinFile = join(root, "sync", "upstream.json");
const pinText = readFileSync(pinFile, "utf8");
const config = JSON.parse(pinText);
const from = config.pin.commit;
const to = execFileSync("git", ["-C", upstream, "rev-parse", `${arg("--to") ?? config.ref}^{commit}`], { encoding: "utf8" }).trim();
const short = (sha) => sha.slice(0, 7);

if (to === from) {
  console.log(JSON.stringify({ action: "none", ok: true, from, to, reason: "upstream has not moved past the pin" }, null, 2));
  process.exit(0);
}

const tool = (name, ...args) => spawnSync(process.execPath, [join(TOOLS, name), ...args, "--root", root], { encoding: "utf8", maxBuffer: 1 << 30 });
mkdirSync(out, { recursive: true });
const summaryFile = join(out, "summary.md");
const sync = tool("sync.mjs", "--upstream", upstream, "--to", to, "--summary", summaryFile);
if (sync.status !== 0 && sync.status !== 1) {
  process.stderr.write(sync.stderr);
  process.exit(2);
}
const ok = sync.status === 0;
const report = JSON.parse(sync.stdout);
if (ok && ["updated", "added", "deleted", "merged"].every((list) => report[list].length === 0)) {
  // Upstream moved, but nothing orcstack derives changed (another plugin, or excluded paths). Keep the pin: no PR.
  writeFileSync(pinFile, pinText);
  console.log(JSON.stringify({ action: "none", ok, from, to, reason: "upstream changed nothing orcstack derives" }, null, 2));
  process.exit(0);
}
if (ok) {
  const build = tool("build.mjs");
  if (build.status !== 0) {
    process.stderr.write(build.stderr);
    process.exit(2);
  }
}

const todo = [
  "## 사람이 할 일",
  "",
  "- [ ] 신규 skill마다 유지·fork·제외를 정한다. 제외는 `sync/upstream.json`의 `exclude`에, fork는 `sync/forks.json`에 이유와 함께 넣는다.",
  "- [ ] 사라진 skill과 삭제된 파일을 orcstack이 참조하던 곳(`src/`의 orcstack 고유 파일, `harness/`, 문서)이 없는지 본다.",
  "- [ ] `src/` denylist 잔존이 있으면 치환 규칙(`sync/substitutions.json`)을 더하거나 그 파일을 fork해 고친다. tier0 validate가 잔존을 막는다.",
  ...(ok
    ? []
    : [
        "- [ ] 충돌 마커를 풀고, 남긴 분기를 `sync/forks.json`에 등록한다. 그다음 같은 커밋으로 pin을 옮기고 `dist/`를 다시 빌드한다:",
        "",
        "  ```bash",
        `  node tools/sync.mjs --upstream <cursor/plugins clone> --to ${to} --resolved`,
        "  node tools/build.mjs",
        "  ```",
      ]),
  "- [ ] `npm run check`가 통과하고 tier0·tier1이 green이면 머지한다.",
  "",
];
const body = join(out, "body.md");
writeFileSync(body, [readFileSync(summaryFile, "utf8").trimEnd(), "", ...todo].join("\n"));

const title = `동기화: upstream pstack ${short(from)} → ${short(to)}`;
console.log(JSON.stringify({ action: "open", ok, from, to, branch: `sync/pstack-${short(to)}`, title, draft: !ok, body }, null, 2));
