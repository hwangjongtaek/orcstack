---
name: test-audit
description: Audit tests against orcstack's rent rules. For each test in scope, answer the six questions (what it guards, whether it fails for the right reason, whether it survives internal changes, whether a lower layer could guard it, its unique signal, its decision link), then keep, move, rewrite, or delete it with evidence. Use for /test-audit, when a change touches tests, when a behavior-preserving change breaks many tests, or for slow or flaky tests.
disable-model-invocation: true
---

# Test audit

Tests pay rent. A test that guards nothing slows every PR and breaks on every refactor. A test that guards an expensive contract stays, even when it is slow. This skill applies **Tests pay rent** from `../orc-mode/references/verification.md` to a concrete set of tests.

## 1. Scope

Pick one scope and state it back:

- The tests a change touches: `git diff --name-only <base>...HEAD` filtered to test files.
- The tests a behavior-preserving change broke.
- The slowest or flakiest tests from CI history, top ten.

Never audit the whole suite in one pass.

## 2. Ask the six questions

For each test:

1. Which acceptance item, requirement, invariant, or past bug does it guard? Cite the brief, the SSOT ID, the ADR, or the fix commit.
2. If that behavior breaks on purpose, does it fail for the right reason? Show it: make the smallest change that breaks the behavior, run the test, and revert. A test that stays green has not answered.
3. Does it stay green when only internals change? Look for assertions on private helpers, call order, mock interactions, and fixture shape.
4. Could a lower, more stable layer guard the same contract (`The lowest stable layer`)?
5. Does it give a failure signal no other guard gives? Name the guard it overlaps with.
6. If the contract is long-lived or risky, is it linked to an ADR or a decision record?

Run the break-on-purpose checks in parallel subagents (`spawn_agent`), each in its own worktree, one test each.

## 3. Decide

| Verdict | When |
|---|---|
| Keep | It guards a named contract, fails for the right reason, and has a unique signal |
| Move | A lower layer can guard the same contract. Write the lower guard first and show it red, then delete this one |
| Rewrite | It guards something real but pins internals. Rewrite it against the observable contract |
| Delete | One of the deletion criteria in the reference holds, with the evidence |

"It is old", "it never failed", and "coverage stays the same" are not reasons to delete. For an expensive contract, a surviving mutation in question 2 may mean a missing contract, not a useless test.

## 4. Change

Each move, rewrite, or delete is its own commit with the evidence in the body. Add the contract ID to every kept test's name or header comment, so **contract-inventory** finds it.

**Reply:** a table of test, the contract it guards, the six answers in short, the verdict, and the evidence; then the commits.
