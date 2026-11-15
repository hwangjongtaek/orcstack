// Structural checks for Tier 0 (SSOT §6): links, SKILL.md frontmatter, upstream attribution.
import { posix } from "node:path";

const LINK = /\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function stripCode(text) {
  return text
    .replace(/^```[\s\S]*?^```/gm, (block) => block.replace(/[^\n]/g, ""))
    .replace(/`[^`\n]*`/g, (span) => " ".repeat(span.length));
}

export function checkLinks(files) {
  const exists = (path) => files.has(path) || [...files.keys()].some((key) => key.startsWith(`${path}/`));
  const problems = [];
  for (const [path, bytes] of files) {
    if (!path.endsWith(".md")) continue;
    stripCode(bytes.toString("utf8"))
      .split("\n")
      .forEach((line, i) => {
        for (const [, href] of line.matchAll(LINK)) {
          if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(href)) continue;
          if (!/[./]/.test(href)) continue; // placeholders such as [title](url)
          const target = posix.normalize(posix.join(posix.dirname(path), decodeURIComponent(href.replace(/[#?].*$/, "")))).replace(/\/$/, "");
          if (!exists(target)) problems.push(`${path}:${i + 1}: broken link ${href}`);
        }
      });
  }
  return problems.sort();
}

export function checkFrontmatter(files) {
  const problems = [];
  for (const [path, bytes] of files) {
    const match = path.match(/^src\/skills\/([^/]+)\/SKILL\.md$/);
    if (!match) continue;
    const frontmatter = bytes.toString("utf8").match(/^---\n([\s\S]*?)\n---/)?.[1];
    if (frontmatter === undefined) {
      problems.push(`${path}: missing frontmatter`);
      continue;
    }
    const field = (key) => frontmatter.match(new RegExp(`^${key}:(.*)$`, "m"))?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
    if (field("name") !== match[1]) problems.push(`${path}: frontmatter name is "${field("name") ?? ""}", expected "${match[1]}"`);
    if (!field("description")) problems.push(`${path}: frontmatter needs a description`);
  }
  return problems.sort();
}

export function checkAttribution(files, pinCommit) {
  const problems = [];
  if (!files.get("LICENSE")?.toString("utf8").includes("Copyright (c) 2026 Lauren Tan")) problems.push("LICENSE: missing the Lauren Tan MIT notice for pstack");
  if (!files.get("NOTICE.md")?.toString("utf8").includes(pinCommit.slice(0, 7))) problems.push(`NOTICE.md: missing the upstream pin ${pinCommit.slice(0, 7)}`);
  return problems;
}
