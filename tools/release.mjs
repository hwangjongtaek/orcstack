#!/usr/bin/env node
// Releases (M5-2). A person runs prepare in a PR; .github/workflows/release.yml tags v<VERSION> once it reaches main.
// Usage: node tools/release.mjs prepare --version <x.y.z> [--date YYYY-MM-DD] [--root <dir>]
//          bumps VERSION and package.json, moves CHANGELOG [Unreleased] into "[x.y.z] - date" with the upstream line
//          taken from the sync/upstream.json pin, and rebuilds dist/ (harness manifests carry the version).
//        node tools/release.mjs notes --version <x.y.z> [--root <dir>]   prints that section's body (the release notes)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAll } from "./build.mjs";
import { writeTree } from "./derive.mjs";
import { UPSTREAM_LINE, findSection, sectionBody } from "./lib/changelog.mjs";

const argv = process.argv.slice(2);
const arg = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
const root = arg("--root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const at = (path) => join(root, path);
const version = arg("--version");
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

function prepare() {
  const current = readFileSync(at("VERSION"), "utf8").trim();
  const [next, now] = [version, current].map((v) => v?.match(SEMVER)?.slice(1).map(Number));
  if (!next) fail(`--version must be x.y.z, got "${version}".`);
  if (now && compare(next, now) <= 0) {
    fail(`--version ${version} must be greater than VERSION ${current}.`);
  }
  const changelog = readFileSync(at("CHANGELOG.md"), "utf8");
  const unreleased = findSection(changelog, "Unreleased");
  if (!unreleased) fail('CHANGELOG.md has no "## [Unreleased]" section.');
  const body = changelog.slice(unreleased.bodyStart, unreleased.end).replace(new RegExp(UPSTREAM_LINE.source, "gm"), "").trim();
  if (!body) fail("CHANGELOG.md [Unreleased] is empty: list the changes before releasing.");
  if (findSection(changelog, version)) fail(`CHANGELOG.md already has a [${version}] section.`);

  const { pin } = JSON.parse(readFileSync(at("sync/upstream.json"), "utf8"));
  const date = arg("--date") ?? new Date().toISOString().slice(0, 10);
  const section = `## [${version}] - ${date}\n\nupstream: pstack ${pin.version} (\`${pin.commit.slice(0, 7)}\`)\n\n${body}\n\n`;
  writeFileSync(at("CHANGELOG.md"), `${changelog.slice(0, unreleased.bodyStart)}\n${section}${changelog.slice(unreleased.end)}`.replace(/\n{3,}/g, "\n\n"));
  writeFileSync(at("VERSION"), `${version}\n`);
  const pkg = JSON.parse(readFileSync(at("package.json"), "utf8"));
  writeFileSync(at("package.json"), `${JSON.stringify({ ...pkg, version }, null, 2)}\n`);
  writeTree(at("dist"), buildAll(root));
  return { released: version, previous: current, date, upstream: { version: pin.version, commit: pin.commit } };
}

function compare(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

if (argv[0] === "prepare") console.log(JSON.stringify(prepare(), null, 2));
else if (argv[0] === "notes") {
  const body = sectionBody(readFileSync(at("CHANGELOG.md"), "utf8"), version ?? "");
  if (!version || body === undefined) fail(`CHANGELOG.md has no [${version}] section.`);
  process.stdout.write(body);
} else {
  console.error("usage: node tools/release.mjs <prepare|notes> --version <x.y.z> [--date YYYY-MM-DD] [--root <dir>]");
  process.exit(2);
}
