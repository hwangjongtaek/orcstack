# Verification policy

orcstack's rules for tests and evidence. They apply to the Bug fix, Feature, and Refactoring playbooks and to the **tdd** and **correct** skills. Where this file is stricter than a playbook or skill, this file wins.

## Two kinds of evidence

| Kind | Answers | Runs | Marked in the brief |
|---|---|---|---|
| Shipping evidence | Does this change work on the product surface now? | Once, for this PR | 📎 one-off evidence |
| Permanent guard | Did a later change break this contract? | On every related commit and PR | 🔒 permanent guard |

Green CI is necessary, not sufficient. One surface pass does not protect next month. Each acceptance item in the brief names which one covers it, or both.

## Crank and ratchet

A test written first to find a usable API is a crank. It pushes the design forward. A test kept to stop an agreed behavior from silently regressing is a ratchet. Use test-first freely as a crank, then decide before the PR which tests stay. A test stays only when it guards an acceptance item, an invariant, a non-functional requirement, or a past bug, and has a failure signal no other guard gives. Delete or rewrite the rest: interface probes, mock call orders, private helper shapes, and errors the type system already blocks. Report what you kept and what you dropped.

## The lowest stable layer

Put each guard at the cheapest layer that can observe the contract without mocking it away:

1. Architecture: make the wrong write path impossible, keep one source of truth.
2. Types and schemas: make the invalid state unrepresentable.
3. Lint and static rules: block forbidden imports and risky call patterns before run time.
4. Unit and property tests: pure, stable contracts such as pricing, parsers, and state transitions.
5. Integration and contract tests: serialization, transactions, external protocols, where the boundary is the contract. Do not mock that boundary.
6. Narrow end-to-end tests: only the core journeys where the interaction between layers is the risk.

The **correct** skill climbs the same ladder from the top.

## Bugs: red before green

1. Make the failure executable first: a cheap regression test when one exists, otherwise a runnable reproduction on the same surface as the report.
2. Watch it fail for the reported reason.
3. Fix.
4. Run the same evidence and watch it pass. A pass on a different surface does not count.
5. Leave a permanent ratchet at a stable seam or a lower layer when the bug was costly or is likely to recur.
6. When no permanent guard is possible, the PR states why, the residual risk, how it was verified, and who approved leaving it unguarded.

## Features: acceptance first

Before any code, the brief's acceptance table states who uses the change and when, the expected result, the forbidden result, side effects, and the invariants that must hold through retries, failures, and lost permissions. Each row names the guard or the surface check that covers it. Use test-first as a crank for domain logic, state transitions, and API design. Skip it for visual exploration and throwaway prototypes.

## Refactoring: scaffolding and fences

Before structure moves, pin the behavior. When the refactor is done, decide what the pin was:

- **Scaffolding.** Existing coverage already guards the behavior. Delete the pin.
- **Fence.** The behavior mattered and nothing guarded it. Rewrite the pin as a test of the observable contract and keep it.

Remove before-and-after equivalence harnesses once their result is recorded in the PR.

## Tests pay rent

When a change touches tests, when a behavior-preserving change breaks many tests, or when a test is slow or flaky, ask of each test:

1. Which acceptance item, requirement, invariant, or past bug does it guard?
2. If that behavior breaks on purpose, does it fail for the right reason?
3. Does it stay green when only internals change?
4. Could a lower, more stable layer guard the same contract?
5. Does it give a failure signal no other guard gives?
6. If the contract is long-lived or risky, is it linked to an ADR or a decision record?

Delete a test only with evidence that one of these holds: its contract is retired (ADR superseded or the owner retired the inventory entry), a faster guard covers the same observable contract and this test adds no signal, a type, schema, or lint rule blocks the state and was shown to catch the past failure, it pins only private helpers, call order, or fixture shape, it ignores meaningful mutations and guards nothing, or a deterministic guard with red evidence replaced it. "It is old", "it never failed", and "coverage stays the same" are not reasons.
