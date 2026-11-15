// derive(upstream tree, sync config) -> orcstack tree. Pure and deterministic (SSOT §6 C3):
// exclude -> rename (contents and paths) -> neutral substitutions (Markdown only) -> denylist scan.
import { wordPattern } from "./sync-config.mjs";

const MARKDOWN = /\.md$/;

export function globToRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*" && glob[i + 1] === "*") {
      // "**/" matches zero or more directories; a trailing "**" matches everything below.
      if (glob[i + 2] === "/") {
        source += "(?:.*/)?";
        i += 2;
      } else {
        source += ".*";
        i += 1;
      }
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

function isBinary(bytes) {
  return bytes.subarray(0, 8000).includes(0);
}

function compile(config) {
  const attribution = config.attribution.lines.map((source) => new RegExp(source));
  return {
    exclude: config.upstream.exclude.map(globToRegExp),
    rename: config.rename.rules.map((rule) => ({ ...rule, re: wordPattern(rule.from, "g") })),
    substitutions: config.substitutions.rules.map((rule) => ({ ...rule, re: new RegExp(rule.pattern, rule.flags) })),
    include: config.denylist.include.map(globToRegExp),
    terms: config.denylist.terms.map((term) => ({ ...term, re: new RegExp(term.pattern, term.flags.replace("g", "")) })),
    isAttribution: (line) => attribution.some((re) => re.test(line)),
  };
}

function count(re, text) {
  re.lastIndex = 0;
  const n = re.global ? (text.match(re) ?? []).length : re.test(text) ? 1 : 0;
  re.lastIndex = 0;
  return n;
}

export function derive(upstreamFiles, config) {
  const rules = compile(config);
  const renamed = Object.fromEntries(rules.rename.map((rule) => [rule.from, 0]));
  const substituted = {};
  const excluded = [];
  const out = new Map();

  const renameText = (text) => {
    let next = text;
    for (const rule of rules.rename) {
      renamed[rule.from] += count(rule.re, next);
      next = next.replace(rule.re, rule.to);
    }
    return next;
  };
  const renamePath = (path) => rules.rename.reduce((next, rule) => next.replace(rule.re, rule.to), path);

  for (const path of [...upstreamFiles.keys()].sort()) {
    if (rules.exclude.some((re) => re.test(path))) {
      excluded.push(path);
      continue;
    }
    const bytes = upstreamFiles.get(path);
    const target = renamePath(path);
    if (out.has(target)) throw new Error(`derive: ${path} and another upstream file both map to ${target}`);
    if (isBinary(bytes)) {
      out.set(target, bytes);
      continue;
    }
    const markdown = MARKDOWN.test(path);
    const lines = bytes.toString("utf8").split("\n").map((line) => {
      if (rules.isAttribution(line)) return line;
      let next = renameText(line);
      if (!markdown) return next;
      for (const rule of rules.substitutions) {
        const n = count(rule.re, next);
        if (n === 0) continue;
        substituted[rule.id] = (substituted[rule.id] ?? 0) + n;
        next = next.replace(rule.re, rule.to);
      }
      return next;
    });
    out.set(target, Buffer.from(lines.join("\n"), "utf8"));
  }

  const files = new Map([...out.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return { files, excluded, renamed, substituted, residue: scan(files, rules) };
}

// Denylist residue in an already derived tree (used by validate on src/).
export function scanResidue(files, config) {
  return scan(files, compile(config));
}

function scan(files, rules) {
  const residue = [];
  for (const [path, bytes] of files) {
    if (!rules.include.some((re) => re.test(path)) || isBinary(bytes)) continue;
    bytes.toString("utf8").split("\n").forEach((line, i) => {
      if (rules.isAttribution(line)) return;
      for (const term of rules.terms) {
        if (term.re.test(line)) residue.push({ path, line: i + 1, id: term.id, kind: term.kind, text: line.trim().slice(0, 200) });
      }
    });
  }
  return residue;
}
