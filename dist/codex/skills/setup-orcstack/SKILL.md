---
name: setup-orcstack
description: Configure which models orcstack uses per role and the reasoning budget for subagents. Detects models available in the current harness and writes that harness's orcstack model sheet. Use for /setup-orcstack, "configure orcstack models", "orcstack budget", or changing orcstack's model choices.
---

# Setup orcstack

Write ``~/.codex/orcstack-models.md``, the current harness's model and reasoning-budget configuration. Without it, every role runs on the session model.

## Steps

### 1. Detect available models

List the exact model identifiers accepted by `spawn_agent` in this session. Prefer the harness's model catalog or CLI when it exposes the user's entitled models. Never copy identifiers from another harness's model sheet. If no source can enumerate them, ask the user to paste the identifiers they can select.

Never write an identifier you have not confirmed is available. The aliases `inherit` and `auto` are always valid. Both run the role on the session model.

### 2. Load current state

The default role mapping is the shape in step 5, and the default budget is `large`. If ``~/.codex/orcstack-models.md`` exists, read its `# budget` line and role values as the current choices.

A sheet without `# defaults: 2` comes from an older setup. Keep a value only when the current harness still reports it. Replace unavailable values with `inherit`. Drop retired roles, including `how explorer`, `how explainer`, `why investigators`, and `why synthesizer`. Tell the user which values changed.

### 3. Budget, map, and confirm

Ask through the `request_user_input_async` tool for one budget:

- `unlimited` uses max reasoning.
- `large` uses xhigh reasoning.
- `medium` uses high reasoning.
- `small` uses medium reasoning.

Use the chosen level as the normal target. `hardest tasks` starts one level higher, up to max. `reflect tooling` and `swarm workers` start one level lower, down to low. A harness may expose effort as a separate control or as part of a model identifier. Use only controls and identifiers the harness reports. Do not invent an effort-suffixed identifier.

Show every role from step 5 with its current value. Mark any real identifier outside the detected set as needing a choice. Offer only detected identifiers plus `inherit` and `auto`.

- Implementation roles (`feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `reflect tooling`, `swarm workers`) favor a fast coding model.
- Judgment roles (`judgment and prose`, `hardest tasks`, `reflect judgment, divergent, synthesizer`) favor the strongest model.
- Panel roles (`arena runners`, `architect runners`, `interrogate reviewers`) are lists. One subagent runs per entry, including aliases. Different model families give the panel different views.
- `arena cross-judge pool` is a preference list for one judge from a different model vendor. An `inherit` or `auto` entry never judges.

On a rerun, keep the user's model families, list lengths, and aliases. Change only invalid identifiers or choices the user asks to change.

### 4. Validate

Every real identifier must be in the current harness's detected set. `inherit` and `auto` always pass. If a value is unavailable, stop and ask again.

### 5. Write the sheet

Overwrite ``~/.codex/orcstack-models.md`` with the selected budget and one line per current role. Re-running the skill must produce the same file for the same choices.

```
# orcstack model configuration. One line per role.
# `inherit` or `auto` runs the role on the session model. Alias entries in a panel list still count toward its fan-out.
# defaults: 2
# budget: large (xhigh)
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
hardest tasks: inherit
reflect tooling: inherit
reflect judgment, divergent, synthesizer: inherit
arena runners: inherit, inherit
arena cross-judge pool: inherit
swarm workers: inherit
architect runners: inherit, inherit
interrogate reviewers: inherit, inherit
```

### 6. Confirm

Tell the user which harness sheet was written. Skills read it each time they spawn, so the next spawn uses it. Re-running this skill updates it.

### 7. Offer a verification skill

If the project has no `verify-*` skill or existing way to drive the real app, offer once to run `/create-verification-skill`. On no, move on.

### 8. Offer a formal verification skill

If the project has no project skill that runs a model checker, proof, or other verifier, offer once to run `/create-formal-verification-skill`. On no, move on.
