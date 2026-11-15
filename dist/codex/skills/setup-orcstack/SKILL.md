---
name: setup-orcstack
description: Configure which model orcstack uses for each role. Detects the models available in this session and writes the orcstack model sheet that the skills read when they spawn subagents. Use for /setup-orcstack, "configure orcstack models", or changing orcstack's model choices.
---

# Setup orcstack

Write ``~/.codex/orcstack-models.md``, the file that sets orcstack's model per role. Without it, every role runs on the session model.

## Steps

### 1. Detect available models

List the model identifiers you can pass to `spawn_agent` in this session. That is the dependable source. If you cannot detect any, ask the user to paste the identifiers they have access to. Never write an identifier you have not confirmed is available. The aliases `inherit` and `auto` are always valid: both mean the role runs on the session model.

### 2. Load current state

If ``~/.codex/orcstack-models.md`` exists, read it and treat its role values as the current choices. Otherwise every role starts at `inherit`. A line whose role is not in step 5 is from a retired role. Drop it.

### 3. Map and confirm

Show every role from step 5 with its current value, and list each line step 2 dropped. Ask through the `request_user_input_async` tool whether to keep the table or change specific roles, offering the detected models plus `inherit` and `auto`.

- Implementation roles (`feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `how explorer`, `why investigators`, `reflect tooling`, `swarm workers`) do a lot of reading and editing. A faster model fits them.
- Judgment roles (`judgment and prose`, `hardest tasks`, `how explainer`, `why synthesizer`, `reflect judgment, divergent, synthesizer`) decide and write. The strongest available model fits them.
- Panel roles (`arena runners`, `architect runners`, `interrogate reviewers`) take a list. One subagent runs per entry, alias entries included, so the list length sets the count. Different models in one list give the panel different views.
- `arena cross-judge pool` is also a list, but Arena runs one judge. It tries values from a family other than the parent's, in list order, so order it by preference. An `inherit` or `auto` value never judges.

### 4. Validate

Every identifier written must be in the detected set. `inherit` and `auto` always pass. If a chosen identifier is not available, stop and ask again.

### 5. Write the sheet

Write ``~/.codex/orcstack-models.md`` with one line per role, using the same labels the skills use. Overwrite the whole file so re-runs stay idempotent. Shape:

```
# orcstack model sheet. One line per role. Delete a line to fall back to `inherit`.
# `inherit` or `auto`: the role runs on the session model. Alias entries in a panel list still count toward its fan-out.
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
hardest tasks: inherit
how explorer: inherit
how explainer: inherit
why investigators: inherit
why synthesizer: inherit
reflect tooling: inherit
reflect judgment, divergent, synthesizer: inherit
arena runners: inherit, inherit
arena cross-judge pool: inherit
swarm workers: inherit
architect runners: inherit, inherit
interrogate reviewers: inherit, inherit
```

### 6. Confirm

Tell the user the sheet was written and that skills read it each time they spawn, so the next spawn uses it. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /create-verification-skill." On yes, run `/create-verification-skill`. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /create-formal-verification-skill." On yes, run `/create-formal-verification-skill`. On no, move on without pushing.
