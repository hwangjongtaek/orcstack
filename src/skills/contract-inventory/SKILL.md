---
name: contract-inventory
description: Build the contract inventory view of a orcstack-governed repository. For each contract in the Planning SSOT, find its intent, failure cost, guard, evidence, and owner, and report the contracts nothing guards. Use for /contract-inventory, "which contracts are unguarded", "audit our contracts", or before a release or a large refactor.
disable-model-invocation: true
---

# Contract inventory

The inventory is a view, not a new file. Each contract should answer: the behavior, its intent and source, the failure cost, the observable signal, the permanent guard or why there is none, the shipping evidence, the owner, and when it may change. The answers already live in the SSOT, briefs, ADRs, and tests. This skill gathers them and finds the holes.

## 1. Collect

Run `node <this skill's directory>/scripts/inventory.mjs collect --root <repository>`. It reads every SSOT table with an `ID` column and a contract column, and lists the briefs, ADRs, and tests that name each ID. `gaps` lists contracts with an empty guard cell and no test naming the ID.

A test that guards a contract but does not name its ID shows up as a gap. Before you call it unguarded, search for the behavior itself. When you find the guard, add the ID to the test's name or header comment so the next collect finds it.

## 2. Look past the user journeys

The SSOT table holds what someone wrote down. Data invariants, idempotency, permission boundaries, and external formats often never reach a screen or a Feature Map. Read the code paths that write data, charge money, grant access, or talk to other systems. List each behavior whose failure would be expensive and has no SSOT row as a **candidate contract**.

## 3. Report

One table, one row per contract and candidate:

| ID | Contract | Failure cost | Guard (layer, path) | Evidence | Owner | Gap |
|---|---|---|---|---|---|---|

Order the gaps by failure cost. For each, propose the lowest stable layer that could guard it (`../orc-mode/references/verification.md`).

## 4. Hand off

Do not write guards or SSOT rows in this skill. A candidate contract goes to the SSOT owner as a proposed SSOT change, through {{ask-user}}. A missing guard becomes its own change with a brief (**work-brief**).

**Reply:** the table, the top gaps with their proposed layer, and the candidate contracts awaiting the owner.
