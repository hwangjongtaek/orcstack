// CHANGELOG.md sections (Keep a Changelog): "## [Unreleased]" and "## [x.y.z] - YYYY-MM-DD" (M5-2).
// Each release section names its upstream as "upstream: pstack <version> (`<commit>`)".

export const UPSTREAM_LINE = /^upstream: pstack \S+ \(`[0-9a-f]{7,40}`\)$/m;

// { start, bodyStart, end } offsets of a section, or undefined. name is "Unreleased" or a version.
export function findSection(text, name) {
  const heading = new RegExp(`^## \\[${name.replace(/\./g, "\\.")}\\][^\\n]*\\n`, "m").exec(text);
  if (!heading) return undefined;
  const bodyStart = heading.index + heading[0].length;
  const next = text.slice(bodyStart).search(/^## \[/m);
  return { start: heading.index, bodyStart, end: next === -1 ? text.length : bodyStart + next };
}

export function sectionBody(text, name) {
  const section = findSection(text, name);
  return section && `${text.slice(section.bodyStart, section.end).trim()}\n`;
}

// Problems with VERSION, package.json, and the CHANGELOG section for VERSION.
export function checkVersion({ version, packageVersion, changelog }) {
  const problems = [];
  if (packageVersion !== undefined && packageVersion !== version) problems.push(`package.json says ${packageVersion}, VERSION says ${version}.`);
  if (version === "0.0.0" || changelog === undefined) return problems;
  const body = sectionBody(changelog, version);
  if (body === undefined) problems.push(`CHANGELOG.md has no "## [${version}]" section. Run node tools/release.mjs prepare.`);
  else if (!UPSTREAM_LINE.test(body)) problems.push(`CHANGELOG.md [${version}] has no "upstream: pstack <version> (<commit>)" line.`);
  return problems;
}
