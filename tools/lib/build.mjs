// buildHarness(src tree, harness table, { version, hooks }) -> the install tree for one harness (ADR-0003).
// {{capability}} tokens in Markdown render through harness.capabilities; anything left over is an error (SSOT §6 C1).
import { globToRegExp } from "./derive.mjs";
import { CAPABILITIES } from "./capabilities.mjs";

export const ATTRIBUTION = "Port of Poteto Stack (pstack) by Lauren Tan.";
const DESCRIPTION = "Personal engineering workflow: one entry point (orc-mode) that routes work to playbooks, with Planning SSOT, work briefs, ADRs, ratcheting tests, and tiered CI.";
const TOKEN = /\{\{([^{}]*)\}\}/g;

function manifest(harness, version, hasHooks) {
  const pkg = harness.package;
  const base = {
    name: pkg.name,
    version,
    description: `${DESCRIPTION} ${ATTRIBUTION}`,
    author: { name: "orcstack" },
    homepage: "https://github.com/hwangjongtaek/orcstack",
    repository: "https://github.com/hwangjongtaek/orcstack",
    license: "MIT",
  };
  if (pkg.manifest === ".codex-plugin/plugin.json") {
    return { ...base, skills: "./skills/", ...(hasHooks ? { hooks: "./hooks/hooks.json" } : {}), interface: { displayName: "orcstack" } };
  }
  return base;
}

function render(path, text, harness) {
  return text
    .split("\n")
    .map((line, i) =>
      line.replace(TOKEN, (_, id) => {
        if (!CAPABILITIES.includes(id)) throw new Error(`${path}:${i + 1}: unknown capability {{${id}}}`);
        const cap = harness.capabilities[id];
        if (!cap) throw new Error(`${path}:${i + 1}: ${harness.harness} does not define {{${id}}}`);
        return cap.render;
      }),
    )
    .join("\n");
}

export function buildHarness(srcFiles, harness, { version, hooks }) {
  const pkg = harness.package;
  const include = pkg.include.map(globToRegExp);
  const out = new Map();
  for (const [path, bytes] of srcFiles) {
    if (!include.some((re) => re.test(path))) continue;
    out.set(path, path.endsWith(".md") ? Buffer.from(render(path, bytes.toString("utf8"), harness), "utf8") : bytes);
  }
  const hasHooks = pkg.hooks && hooks.has("hooks.json");
  if (pkg.manifest) out.set(pkg.manifest, Buffer.from(`${JSON.stringify(manifest(harness, version, hasHooks), null, 2)}\n`));
  if (pkg.hooks) for (const [path, bytes] of hooks) out.set(`hooks/${path}`, bytes);
  return new Map([...out.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
