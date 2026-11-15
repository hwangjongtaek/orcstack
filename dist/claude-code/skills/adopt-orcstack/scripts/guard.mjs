#!/usr/bin/env node
// Installed by adopt-orcstack as .orcstack/check-no-sdd.mjs. Fails when SDD, Spec Kit, Superpowers, or tmux-orchestrator
// artifacts appear outside docs/archive/ after the cutover, or when .orcstack/config.json has errors (orcstack ADR-0004).
// Usage: node .orcstack/check-no-sdd.mjs [--root <dir>]
import { resolveExtensions } from "./extensions.mjs";
import { findFrameworkArtifacts, readRepository, splitIgnored } from "./signals.mjs";

const argv = process.argv.slice(2);
const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : process.cwd();
const { artifacts: found } = splitIgnored(root, findFrameworkArtifacts(readRepository(root)));
for (const { framework, path, signal } of found) console.log(`${framework}\t${path}\t(${signal})`);
if (found.length > 0) console.log(`\n${found.length} artifacts of frameworks that cannot be mixed with orcstack. Frozen documents belong in docs/archive/<framework>/.`);
else console.log("no SDD, Spec Kit, Superpowers, tmux-orchestrator, or pstack routing artifacts.");

const { errors } = resolveExtensions(root);
for (const error of errors) console.log(`.orcstack/config.json\t${error}`);
if (errors.length > 0) console.log(`\n${errors.length} errors in the project extension config. See .orcstack/README.md.`);
process.exit(found.length > 0 || errors.length > 0 ? 1 : 0);
