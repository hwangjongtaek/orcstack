// Loads and validates the upstream sync rules in sync/*.json.
// Rules are data so that a rule change shows up in review, and derivation stays deterministic.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SYNC_FILES = ["upstream", "rename", "substitutions", "denylist", "attribution", "forks"];

const SHA = /^[0-9a-f]{40}$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FLAGS = /^[gimsu]*$/;
const KINDS = new Set(["rewrite", "redesign"]);

export function loadSyncConfig(dir) {
  const config = {};
  const errors = [];
  for (const name of SYNC_FILES) {
    const path = join(dir, `${name}.json`);
    try {
      config[name] = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      errors.push(`${name}.json: ${error.message}`);
    }
  }
  if (errors.length === 0) errors.push(...validateSyncConfig(config));
  if (errors.length > 0) throw new Error(`invalid sync config in ${dir}\n${errors.join("\n")}`);
  return config;
}

export function validateSyncConfig(config) {
  const errors = [];
  const fail = (where, message) => errors.push(`${where}: ${message}`);

  checkUpstream(config.upstream, fail);
  checkRename(config.rename, fail);
  checkRegexRules("substitutions.rules", config.substitutions?.rules, fail, (rule, where) => {
    if (typeof rule.to !== "string") fail(where, "to must be a string");
  });
  checkStrings("denylist.include", config.denylist?.include, fail);
  checkRegexRules("denylist.terms", config.denylist?.terms, fail, (rule, where) => {
    if (!KINDS.has(rule.kind)) fail(where, `kind must be one of ${[...KINDS].join(", ")}`);
  });
  checkStrings("attribution.lines", config.attribution?.lines, fail);
  for (const [i, source] of (config.attribution?.lines ?? []).entries()) compiles(`attribution.lines[${i}]`, source, "", fail);
  checkForks(config.forks?.forks, fail);
  return errors;
}

function checkUpstream(upstream, fail) {
  if (!upstream) return fail("upstream", "missing");
  for (const key of ["remote", "subdir", "ref"]) {
    if (typeof upstream[key] !== "string" || upstream[key] === "") fail(`upstream.${key}`, "must be a non-empty string");
  }
  if (!SHA.test(upstream.pin?.commit ?? "")) fail("upstream.pin.commit", "must be a full 40-character commit SHA");
  if (typeof upstream.pin?.version !== "string") fail("upstream.pin.version", "must be a string");
  checkStrings("upstream.exclude", upstream.exclude, fail);
}

function checkRename(rename, fail) {
  const rules = rename?.rules;
  if (!Array.isArray(rules) || rules.length === 0) return fail("rename.rules", "must be a non-empty array");
  const seen = new Set();
  rules.forEach((rule, i) => {
    const where = `rename.rules[${rule?.from ?? i}]`;
    if (typeof rule?.from !== "string" || rule.from === "") return fail(where, "from must be a non-empty string");
    if (typeof rule.to !== "string" || rule.to === "") fail(where, "to must be a non-empty string");
    if (seen.has(rule.from)) fail(where, "duplicate from");
    seen.add(rule.from);
    // Rules apply in order, so an earlier rule that matches inside this one rewrites it first.
    for (const earlier of rules.slice(0, i)) {
      if (typeof earlier?.from === "string" && wordPattern(earlier.from).test(rule.from)) {
        fail(where, `never applies, because the earlier rule ${earlier.from} rewrites it first`);
      }
    }
  });
}

export function wordPattern(literal, flags = "") {
  return new RegExp(`\\b${literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, flags);
}

function checkRegexRules(where, rules, fail, extra) {
  if (!Array.isArray(rules) || rules.length === 0) return fail(where, "must be a non-empty array");
  const ids = new Set();
  rules.forEach((rule, i) => {
    const at = `${where}[${rule?.id ?? i}]`;
    if (!ID.test(rule?.id ?? "")) fail(at, "id must be lowercase words joined by hyphens");
    else if (ids.has(rule.id)) fail(where, `duplicate id ${rule.id}`);
    ids.add(rule?.id);
    if (!FLAGS.test(rule?.flags ?? "")) fail(at, "flags may only contain g, i, m, s, u");
    else compiles(at, rule?.pattern, rule?.flags ?? "", fail);
    extra(rule ?? {}, at);
  });
}

function compiles(where, source, flags, fail) {
  if (typeof source !== "string" || source === "") return fail(where, "pattern must be a non-empty string");
  try {
    new RegExp(source, flags);
  } catch (error) {
    fail(where, `pattern does not compile: ${error.message}`);
  }
}

function checkStrings(where, list, fail) {
  if (!Array.isArray(list) || list.length === 0) return fail(where, "must be a non-empty array");
  list.forEach((item, i) => {
    if (typeof item !== "string" || item === "") fail(`${where}[${i}]`, "must be a non-empty string");
  });
}

function checkForks(forks, fail) {
  if (!Array.isArray(forks)) return fail("forks.forks", "must be an array");
  const paths = new Set();
  for (const fork of forks) {
    const where = `forks[${fork?.path ?? "?"}]`;
    if (typeof fork?.path !== "string" || fork.path === "") fail(where, "path must be a non-empty string");
    else if (paths.has(fork.path)) fail(where, "duplicate path");
    paths.add(fork?.path);
    if (typeof fork?.reason !== "string" || fork.reason.trim() === "") fail(where, "reason must explain why the file diverges");
    if (!SHA.test(fork?.since ?? "")) fail(where, "since must be the full upstream commit SHA the fork started from");
  }
}
