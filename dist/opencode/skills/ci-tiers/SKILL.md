---
name: ci-tiers
description: Set up orcstack's CI tiers as GitHub Actions workflows for any repository and harness. Tier 0 structural gate and Tier 1 contract gate run on every push and PR with the same commands as local runs; Tier 2 runs nightly and on risk-labeled PRs. Use for /ci-tiers, "set up CI", "add a commit build", or when a orcstack-governed repository has no tiered CI.
disable-model-invocation: true
---

# CI tiers

| Tier | When | What | Budget |
|---|---|---|---|
| 0 Structural gate | Every push and PR | Types, architecture rules, lint, the smallest deterministic tests | 2 minutes |
| 1 Contract gate | Every PR | Affected unit, property, contract, cheap integration, and bug regression tests | P95 10 minutes with Tier 0 |
| 2 Costly confidence | Nightly, on demand, PRs labeled `risk:high` | Full integration, migration rehearsal, concurrency and recovery, optional mutation and fault injection | Does not block every PR |
| 3 Independent release evidence | Before releasing important changes, outside CI | A verifier who did not write the code checks the product surface | Never replaces Tiers 0 to 2 |

Tier 0 and Tier 1 together are the commit build. Red blocks the merge. A broken `main` gets fixed before new work.

## 1. One local command per tier

Read the repository's build files and existing CI. Find or create one command per tier that a developer runs locally with no manual steps, such as `npm run tier0` and `npm test`, or `make tier0` and `make tier1`. CI must run exactly the same commands. When a tier needs a command that does not exist yet, add it to the repository's own build file first.

Sort the existing checks into tiers by cost and by what they guard. A contract whose failure is expensive (data loss, billing, permissions) stays in Tier 1 even when it is slow.

## 2. Write the workflows

Run `node <this skill's directory>/scripts/ci-tiers.mjs write --tier0 "<cmd>" [--tier1 "<cmd>"] [--tier2 "<cmd>"] [--install "<cmd>"] [--setup node|python|go|none] --root <repository>`.

- `--setup` defaults to what the repository looks like. `--install` adds a dependency step before the command, such as `npm ci`.
- It keeps any existing workflow with the same name. Show the user the difference and ask through the `question` tool before you rerun with `--force`.

## 3. Prove each gate

Make Tier 0 and Tier 1 fail once on purpose in a throwaway branch, such as a lint error and a broken assertion, and confirm the PR shows red. Then require `tier0` and `tier1` as status checks on `main` in the repository's branch protection. Changing branch protection is the user's action. Tell them the exact check names.

## 4. Budgets

When a tier goes over budget, first merge duplicate contracts, move tests to lower layers, trim fixtures and global state, and parallelize. Turning off an important guard for speed is the last resort, and it needs an ADR.

**Reply:** the command per tier, the workflows written or kept, the red runs that proved each gate, and the status checks to require.
