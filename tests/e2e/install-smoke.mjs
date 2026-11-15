#!/usr/bin/env node
// Install smoke for every harness (Tier 2, M5-3; not part of `npm test`). No model calls.
// Installs this checkout's builds the way README tells people to, each into a throwaway config directory,
// and checks that the harness reports VERSION and that orc-mode is in the installed tree.
// It also reports harness CLI versions that drifted from harness/*.json "measured" (ADR-0003). Drift is reported,
// not failed: a new harness release is a reason to re-measure, not a broken orcstack.
// Usage: node tests/e2e/install-smoke.mjs [--require]   --require fails when a harness CLI is not installed (CI)
import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const VERSION = readFileSync(join(REPO, "VERSION"), "utf8").trim();
const requireAll = process.argv.includes("--require");
const scratch = mkdtempSync(join(tmpdir(), "orcstack-install-smoke-"));

const run = (cmd, args, { env = {}, cwd = scratch } = {}) => {
  const result = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: "utf8", timeout: 180_000 });
  if (result.error) throw new Error(`${cmd} ${args.join(" ")}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(" ")} exited ${result.status}: ${(result.stderr || result.stdout).trim().slice(0, 500)}`);
  return result.stdout;
};
const onPath = (cmd) => spawnSync(cmd, ["--version"], { encoding: "utf8" }).status === 0;
const cliVersion = (cmd) => spawnSync(cmd, ["--version"], { encoding: "utf8" }).stdout.match(/\d+\.\d+\.\d+/)?.[0];
const measured = (name) => JSON.parse(readFileSync(join(REPO, "harness", `${name}.json`), "utf8")).measured.version;
const dir = (name) => {
  const path = join(scratch, name);
  mkdirSync(path, { recursive: true });
  return path;
};
// The first file under root whose path ends with suffix.
function find(root, suffix) {
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (path.endsWith(suffix)) return path;
    if (statSync(path).isDirectory()) {
      const hit = find(path, suffix);
      if (hit) return hit;
    }
  }
  return undefined;
}
const expect = (ok, message) => {
  if (!ok) throw new Error(message);
};

const HARNESSES = {
  "claude-code": {
    cli: "claude",
    install() {
      const env = { CLAUDE_CONFIG_DIR: dir("claude") };
      run("claude", ["plugin", "marketplace", "add", REPO], { env });
      run("claude", ["plugin", "install", "orcstack@orcstack"], { env });
      const plugin = JSON.parse(run("claude", ["plugin", "list", "--json"], { env })).find((p) => p.id === "orcstack@orcstack");
      expect(plugin?.enabled, "orcstack@orcstack is not installed and enabled");
      expect(plugin.version === VERSION, `installed version ${plugin.version}, VERSION ${VERSION}`);
      expect(existsSync(join(plugin.installPath, "skills", "orc-mode", "SKILL.md")), "orc-mode is missing from the install");
      expect(existsSync(join(plugin.installPath, "hooks", "hooks.json")), "the SessionStart hook is missing from the install");
      return plugin.installPath;
    },
  },
  codex: {
    cli: "codex",
    install() {
      const env = { CODEX_HOME: dir("codex") };
      run("codex", ["plugin", "marketplace", "add", REPO], { env });
      run("codex", ["plugin", "add", "orcstack@orcstack"], { env });
      const line = run("codex", ["plugin", "list"], { env }).split("\n").find((l) => l.startsWith("orcstack@orcstack"));
      expect(line && /installed, enabled/.test(line), `orcstack@orcstack is not installed and enabled: ${line}`);
      expect(line.split(/\s{2,}/).includes(VERSION), `installed version is not ${VERSION}: ${line}`);
      const skill = find(env.CODEX_HOME, join("skills", "orc-mode", "SKILL.md"));
      expect(skill, "orc-mode is missing from the install");
      expect(existsSync(join(skill, "..", "..", "..", "hooks", "hooks.json")), "the SessionStart hook is missing from the install");
      return join(skill, "..", "..", "..");
    },
  },
  omp: {
    cli: "omp",
    install() {
      const env = { HOME: dir("omp-home") };
      const project = dir("omp-project");
      run("git", ["init", "-q"], { cwd: project });
      run("omp", ["plugin", "marketplace", "add", REPO], { env, cwd: project });
      run("omp", ["plugin", "install", "orcstack-omp@orcstack", "--scope=project"], { env, cwd: project });
      const listed = run("omp", ["plugin", "list"], { env, cwd: project });
      expect(listed.includes(`orcstack-omp@orcstack (${VERSION})`), `orcstack-omp@orcstack (${VERSION}) is not listed:\n${listed}`);
      const skill = find(env.HOME, join("skills", "orc-mode", "SKILL.md"));
      expect(skill, "orc-mode is missing from the install");
      return join(skill, "..", "..", "..");
    },
  },
  opencode: {
    cli: "opencode",
    install() {
      const home = dir("opencode-home");
      const env = { HOME: home, XDG_CONFIG_HOME: join(home, ".config") };
      run(process.execPath, [join(REPO, "tools", "orcstack.mjs"), "install", "--harness", "opencode", "--apply"], { env });
      const project = dir("opencode-project");
      run("git", ["init", "-q"], { cwd: project });
      // opencode exits before flushing a piped stdout past 64 KB, so the skill list goes to a file.
      const listFile = join(scratch, "opencode-skills.json");
      const fd = openSync(listFile, "w");
      const listed = spawnSync("opencode", ["debug", "skill"], { cwd: project, env: { ...process.env, ...env }, stdio: ["ignore", fd, "pipe"], timeout: 180_000 });
      closeSync(fd);
      expect(listed.status === 0, `opencode debug skill exited ${listed.status}: ${listed.stderr}`);
      const skills = JSON.parse(readFileSync(listFile, "utf8"));
      const dama = skills.find((s) => s.name === "orc-mode");
      expect(dama, "opencode does not list orc-mode");
      expect(dama.location.startsWith(join(env.XDG_CONFIG_HOME, "opencode", "skills", "orcstack")), `orc-mode loads from ${dama.location}, not the orcstack link`);
      expect(skills.filter((s) => s.name === "orc-mode").length === 1, "opencode lists orc-mode more than once");
      return dama.location;
    },
  },
};

const results = [];
for (const [name, harness] of Object.entries(HARNESSES)) {
  if (!onPath(harness.cli)) {
    results.push({ harness: name, ok: !requireAll, skipped: `${harness.cli} is not installed` });
    continue;
  }
  const version = cliVersion(harness.cli);
  const drift = version !== measured(name) ? { measured: measured(name), now: version } : undefined;
  try {
    results.push({ harness: name, ok: true, cli: version, drift, installed: harness.install() });
  } catch (error) {
    results.push({ harness: name, ok: false, cli: version, drift, error: error.message });
  }
}
console.log(JSON.stringify({ version: VERSION, scratch, results }, null, 2));
process.exit(results.every((r) => r.ok) ? 0 : 1);
