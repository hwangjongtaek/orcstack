---
name: adr
description: Record, supersede, or check architecture decision records in docs/adr/ for long-lived or costly-to-reverse decisions. Accepted ADRs are never edited; a changed decision gets a new ADR that supersedes the old one. Use for /adr, "write an ADR", "record this decision", or when a change makes a decision that should outlive it.
disable-model-invocation: true
---

# ADR

A test says a contract broke. It does not say why the contract matters or when it may change. An ADR does. Write one only for a decision that is long-lived or costly to reverse, not for each test or each change.

The deterministic steps run through `scripts/adr.mjs` next to this file: `node <this skill's directory>/scripts/adr.mjs <command> --root <repository>`. Each prints JSON.

## Decide whether it needs an ADR

Write one when at least one holds:

- Reversing it later would cost a migration, a data change, or a broken external contract.
- A reasonable engineer would pick a different option without knowing the constraint.
- It sets a rule other changes must follow, such as a boundary, a format, or an ownership split.

Otherwise the brief is enough. Say so and stop.

## Write one

1. Run `new --slug <kebab-case> --title <title> [--milestone <m>]`. It takes the next number in the ADR directory (`records.adr`, default `docs/adr`), keeping the width the existing ADRs use, and fills that directory's `_template.md`, or the orcstack template, with status `Proposed`. It reads both a `- 상태:` line and a `## Status` section.
2. Fill **context** (the constraint and the failure cost), **decision**, **rejected alternatives** with the reason each lost, **consequences** (the guards it creates, the costs, the follow-ups), and the **revisit condition**: an observable signal, not "when needed".
3. Link it from the brief of the change that made the decision. If a guard enforces it, name the ADR in that guard's test or rule.
4. The status becomes `Accepted` when the owner approves it. Ask through the `AskUserQuestion` tool when the owner is not the person you are working with.

## Change a decision

Never edit an accepted ADR. Write the new ADR, then run `supersede <old number> --by <new number>`. It changes only the old ADR's status line.

## Check

`check` validates file names, unique numbers, titles, statuses, and supersede targets. `check --base <git ref>` also fails when an ADR that was accepted at that ref changed anything but its status line, or was deleted. Run it with the PR's base before opening the PR. A repository can add it to its Tier 0 CI.

**Reply:** the ADR path and status, the decision in one sentence, and the revisit condition.
