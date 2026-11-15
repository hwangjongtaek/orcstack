---
name: work-brief
description: Write or check the short brief each change starts from in a orcstack-governed repository. The brief names the Planning SSOT section the change serves and lists acceptance items, each covered by a permanent guard or one-off evidence. Use for /work-brief, "write a brief", or when orc-mode's gate finds no brief for the change.
disable-model-invocation: true
---

# Work brief

A brief is the committed record of one change. It says which SSOT section the change serves, what must be true when it is done, and what proves it. A plan for the run is temporary. The brief stays.

The deterministic steps run through `scripts/brief.mjs` next to this file: `node <this skill's directory>/scripts/brief.mjs <command> --root <repository>`. Each prints JSON.

## Write one

1. **Find the intent.** Read the Planning SSOT (`records.ssot` in `.orcstack/config.json`, default `docs/planning/SSOT.md`) and name the section and IDs the change serves, such as `§4 F6, §6 C7`. If the change needs intent the SSOT does not state, stop. Propose the SSOT edit and get the owner's approval through the `ask` tool first. Never write intent into the brief that the SSOT does not hold.
2. **Create the file.** Run `new --slug <kebab-case> --title <title> --ssot "<reference>" [--item <work item>]`. It writes `docs/briefs/<slug>.md` from the repository's `_template.md`, or the orcstack template, and refuses a reference the SSOT does not have.
3. **Fill it.** Two or three sentences on what and why. Then the acceptance table, built per `../orc-mode/references/verification.md`:
   - One row per observable outcome: the expected result and the **forbidden** result.
   - For a feature, also side effects and the invariants that must hold through retries, failures, and lost permissions.
   - The evidence column says 🔒 permanent guard, with the layer and the test, or 📎 one-off evidence, with what you will check. A row can carry both.
4. **Out of scope and remaining risk.** Name what the change leaves out. For a contract that gets no permanent guard, state why, the residual risk, and how it is verified.
5. Run `check`. Fix every line it prints.

## Check

`check` reads every brief in the brief directory (`records.briefs`, default `docs/briefs/`). With `--base <ref>`, it checks only briefs added or changed since that ref, so briefs written before the cutover in another format do not fail. It fails when a brief has no `- SSOT:` line, names a section or ID the SSOT lacks, has no acceptance rows, or has a row that marks neither 🔒 nor 📎. Run it before opening the PR. A repository can add it to its Tier 0 CI as the input gate.

**Reply:** the brief path, the SSOT reference, and the acceptance rows with their evidence kind.
