#!/usr/bin/env node
// Project extension points (orcstack ADR-0004, https://github.com/hwangjongtaek/orcstack/blob/main/docs/adr/0004-project-extensions.md). Reads <repo>/.orcstack/config.json, checks it against the orcstack catalog,
// and prints what orc-mode applies: playbooks and skills turned off, extended, replaced, or added.
// Usage: node extensions.mjs resolve [--root <repo>]   (exit 1 when the config has errors)
// Installed into a project's .orcstack/ by `adopt.mjs guard`, next to catalog.json.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { checkRecords } from "./records.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const LOCKED_SKILLS = ["orc-mode", "adopt-orcstack"];
const ALWAYS_ON_PLAYBOOKS = ["opening-a-pr"];
const KEYS = ["version", "records", "playbooks", "skills"];

// The bundled names: catalog.json beside this file in a project, or the plugin's skills directory.
export function loadCatalog(dir = HERE) {
  if (existsSync(join(dir, "catalog.json"))) return JSON.parse(readFileSync(join(dir, "catalog.json"), "utf8"));
  const skills = join(dir, "..", "..");
  return {
    playbooks: readdirSync(join(skills, "orc-mode", "playbooks")).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3)).sort(),
    skills: readdirSync(skills).filter((d) => existsSync(join(skills, d, "SKILL.md"))).sort(),
  };
}

function checkPath(root, label, path, errors) {
  if (typeof path !== "string" || path === "") {
    errors.push(`${label}: the path must be a string relative to .orcstack/.`);
    return undefined;
  }
  const clean = normalize(path);
  if (isAbsolute(path) || clean === ".." || clean.startsWith(`..${sep}`)) {
    errors.push(`${label}: "${path}" must be a path inside .orcstack/.`);
    return undefined;
  }
  if (!clean.endsWith(".md")) {
    errors.push(`${label}: "${path}" must point at a .md file.`);
    return undefined;
  }
  const file = join(root, ".orcstack", clean);
  if (!existsSync(file) || !statSync(file).isFile()) {
    errors.push(`${label}: .orcstack/${clean} does not exist.`);
    return undefined;
  }
  return file;
}

export function resolveExtensions(root, catalog = loadCatalog()) {
  const out = { config: null, errors: [], records: checkRecords(undefined).records, playbooks: { off: [], extend: {}, replace: {}, add: {} }, skills: { off: [], extend: {} } };
  const configPath = join(root, ".orcstack", "config.json");
  if (!existsSync(configPath)) return out;
  out.config = configPath;
  const errors = out.errors;

  let config;
  try {
    config = JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    errors.push(`.orcstack/config.json is not valid JSON: ${error.message}`);
    return out;
  }
  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    errors.push(".orcstack/config.json must be a JSON object.");
    return out;
  }
  if (config.version !== 1) errors.push(".orcstack/config.json: version must be 1.");
  for (const key of Object.keys(config)) {
    if (!KEYS.includes(key) && !key.startsWith("$")) errors.push(`.orcstack/config.json: unknown key "${key}". Use version, records, playbooks, and skills.`);
  }
  const records = checkRecords(config.records);
  out.records = records.records;
  errors.push(...records.errors);

  for (const kind of ["playbooks", "skills"]) {
    const entries = config[kind] ?? {};
    if (typeof entries !== "object" || Array.isArray(entries)) {
      errors.push(`.orcstack/config.json: ${kind} must be an object keyed by name.`);
      continue;
    }
    const known = catalog[kind];
    const singular = kind.slice(0, -1);
    for (const [name, value] of Object.entries(entries)) {
      const label = `${kind}.${name}`;
      if (!NAME.test(name)) {
        errors.push(`${label}: "${name}" must be a kebab-case file name, as in bug-fix.`);
        continue;
      }
      const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
      if (value !== "off" && !isObject) {
        errors.push(`${label}: the value must be "off" or an object with extend, replace, or add.`);
        continue;
      }
      const actions = isObject ? ["extend", "replace", "add"].filter((a) => a in value) : ["off"];
      if (actions.length !== 1) {
        errors.push(`${label}: give exactly one of "off", extend, replace, or add.`);
        continue;
      }
      const [action] = actions;
      if (kind === "skills" && (action === "replace" || action === "add")) {
        errors.push(`${label}: skills take "off" or extend. To replace or add a skill, turn the orcstack one off and put a project skill in the harness's own project skills directory.`);
        continue;
      }
      if (kind === "skills" && LOCKED_SKILLS.includes(name)) {
        errors.push(`${label}: ${name} holds the orcstack gate and cutover, so it cannot be turned off or extended.`);
        continue;
      }
      if (kind === "playbooks" && action === "off" && ALWAYS_ON_PLAYBOOKS.includes(name)) {
        errors.push(`${label}: ${name} ends every other playbook, so it cannot be turned off. Extend or replace it instead.`);
        continue;
      }
      if (action === "add") {
        if (known.includes(name)) {
          errors.push(`${label}: ${name} is already a orcstack playbook. Use extend or replace for it, or pick another name.`);
          continue;
        }
        if (typeof value.when !== "string" || value.when.trim() === "") {
          errors.push(`${label}: an added playbook needs "when", the sentence orc-mode matches tasks against.`);
          continue;
        }
      } else if (!known.includes(name)) {
        errors.push(`${label}: ${name} is not a orcstack ${singular}. Check the spelling, or run adopt-orcstack guard again after updating orcstack.`);
        continue;
      }
      if (action === "off") {
        out[kind].off.push(name);
        continue;
      }
      const file = checkPath(root, label, value[action], errors);
      if (!file) continue;
      out[kind][action][name] = action === "add" ? { file, when: value.when.trim() } : file;
    }
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  if (argv[0] !== "resolve") {
    console.error("usage: node extensions.mjs resolve [--root <repo>]");
    process.exit(2);
  }
  const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : process.cwd();
  const result = resolveExtensions(root);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.errors.length ? 1 : 0);
}
