// Finds artifacts of workflow frameworks that cannot be mixed with orcstack (orcstack SSOT §6 C5, orcstack ADR-0002 D8).
// Signals come from orcstack's docs/spikes/framework-signals.md. Frozen archives under docs/archive/ are allowed.
// This file is the single source: orcstack's own Tier 0 check and the guard that adopt-orcstack installs both import it.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PATH_SIGNALS = [
  ["sdd", /(^|\/)specs\/(?:.+\/)?(requirements|specs|plans)\.md$/],
  ["speckit", /^\.specify\//],
  ["speckit", /(^|\/)specs\/\d{3}-[^/]+\/(spec|plan|tasks|research|data-model|quickstart)\.md$/],
  ["speckit", /^\.(claude|agents)\/skills\/speckit-[^/]+\//],
  ["speckit", /^\.(opencode|omp)\/commands\/speckit\.[^/]+$/],
  ["speckit", /^\.pi\/prompts\/speckit\.[^/]+$/],
  ["superpowers", /^docs\/superpowers\/(specs|plans)\//],
];

// tmux-orchestrator is listed because it runs SDD plans: its dispatch loop starts from specs/ plans.md.
// pstack is listed because its poteto-mode is a second router; orcstack is its port, and the cutover swaps the routing.
export const PLUGINS = [
  ["sdd", /^sdd-helper@/],
  ["superpowers", /^superpowers@/],
  ["tmux-orchestrator", /^tmux-orchestrator@/],
  ["pstack", /^pstack@/],
];

// Agent instruction files that route work through pstack's poteto-mode. The orcstack block may name it when it
// replaces that routing, so text between the orcstack markers does not count.
const INSTRUCTION_FILE = /(^|\/)(AGENTS|CLAUDE|GEMINI)\.md$/;
function pstackRoutingLines(text) {
  const lines = text.split("\n");
  let inBlock = false;
  const hits = [];
  lines.forEach((line, i) => {
    if (line.includes("<!-- orcstack:begin -->")) inBlock = true;
    if (!inBlock && /\bpoteto-mode\b/.test(line)) hits.push(i + 1);
    if (line.includes("<!-- orcstack:end -->")) inBlock = false;
  });
  return hits;
}

function parse(bytes) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return undefined;
  }
}

export function findFrameworkArtifacts(files) {
  const found = [];
  for (const [path, bytes] of files) {
    if (path.startsWith("docs/archive/")) continue;
    const pathHit = PATH_SIGNALS.find(([, re]) => re.test(path));
    if (pathHit) {
      found.push({ path, framework: pathHit[0], signal: "file" });
      continue;
    }
    if (INSTRUCTION_FILE.test(path)) {
      const lines = pstackRoutingLines(bytes.toString("utf8"));
      if (lines.length) found.push({ path, framework: "pstack", signal: "routing instruction", lines });
    }
    if (/(^|\/)\.claude\/settings(\.local)?\.json$/.test(path)) {
      const enabled = Object.entries(parse(bytes)?.enabledPlugins ?? {}).filter(([, on]) => on === true).map(([name]) => name);
      for (const [framework, re] of PLUGINS) if (enabled.some((name) => re.test(name))) found.push({ path, framework, signal: "enabled plugin" });
    }
    if (/(^|\/)opencode\.jsonc?$/.test(path)) {
      const config = parse(bytes) ?? {};
      const plugins = [...(config.plugin ?? []), ...(config.plugins ?? [])].map(String);
      if (plugins.some((name) => name.startsWith("superpowers"))) found.push({ path, framework: "superpowers", signal: "enabled plugin" });
    }
  }
  return found.sort((a, b) => (a.path === b.path ? (a.framework < b.framework ? -1 : 1) : a.path < b.path ? -1 : 1));
}

// Splits artifacts into the ones a commit can carry and the ones git ignores. Ignored files are a developer's
// private local records: never moved into docs/archive/ (that would commit them) and never counted by the guard.
// Outside a git repository nothing is ignored.
export function splitIgnored(root, artifacts) {
  const paths = [...new Set(artifacts.map((a) => a.path))];
  const result = paths.length ? spawnSync("git", ["-C", root, "check-ignore", "--stdin"], { input: paths.join("\n"), encoding: "utf8" }) : undefined;
  const ignored = new Set(result && (result.status === 0 || result.status === 1) ? result.stdout.split("\n").filter(Boolean) : []);
  return { artifacts: artifacts.filter((a) => !ignored.has(a.path)), ignored: artifacts.filter((a) => ignored.has(a.path)) };
}

// Walks a repository into a Map of path -> Buffer, skipping VCS, dependencies, and frozen archives.
// A subdirectory with its own .git entry (a worktree such as .claude/worktrees/<name>, a submodule, a nested clone)
// is another repository: its files are not this one's. It is skipped, and its path is pushed onto `nested`.

const SKIP = new Set([".git", "node_modules", ".DS_Store"]);

export function readRepository(root, nested = []) {
  const files = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const path = join(dir, name);
      const rel = relative(root, path).split("\\").join("/");
      if (rel === "docs/archive") continue;
      if (!statSync(path).isDirectory()) files.set(rel, readFileSync(path));
      else if (existsSync(join(path, ".git"))) nested.push(rel);
      else walk(path);
    }
  };
  walk(root);
  nested.sort();
  return files;
}
