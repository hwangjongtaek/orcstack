---
name: setup-orcstack
description: Configure which models orcstack uses per role and the reasoning budget for subagents. Detects models available in the current harness and writes that harness's orcstack model sheet. Use for /setup-orcstack, "configure orcstack models", "orcstack budget", or changing orcstack's model choices.
---

# Setup orcstack

Write `{{model-sheet}}`, the current harness's model and reasoning-budget configuration. Without it, every role runs on the session model.

## Steps

### 1. Detect available models

List the exact model identifiers accepted by {{spawn-subagent}} in this session. Prefer the harness's model catalog or CLI when it exposes the user's entitled models. Never copy identifiers from another harness's model sheet. If no source can enumerate them, ask the user to paste the identifiers they can select.

Never write an identifier you have not confirmed is available. The aliases `inherit` and `auto` are always valid. Both run the role on the session model.

### 2. Load current state

<<<<<<< orcstack
The default role mapping is the shape in step 5, and the default budget is `large`. If `{{model-sheet}}` exists, read its `# budget` line and role values as the current choices.

A sheet without `# defaults: 2` comes from an older setup. Keep a value only when the current harness still reports it. Replace unavailable values with `inherit`. Drop retired roles, including `how explorer`, `how explainer`, `why investigators`, and `why synthesizer`. Tell the user which values changed.

### 3. Budget, map, and confirm
=======
The default role-to-model mapping is the rule shape shown in step 5 below. If `{{model-sheet}}` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `hardest tasks`, `architect runners`, `reflect tooling`, or `why investigators`, is from a retired role. Drop it.

Older defaults put another Gemini model, then `gemini-4-neon-high`, in the panel seat. So in any rule, a `gemini-4-neon-high` entry, or a `gemini-4-*` entry other than `gemini-4-neon-*`, in a panel role (`arena runners`, `arena cross-judge pool`, `interrogate reviewers`) is an old default. Each one becomes `gemini-4-neon-xhigh`. A Gemini 4 Neon entry at any other level is the user's choice and stays. Tell the user which entries you replaced.

A rule without the `# defaults: 3` line comes from an older setup. That setup wrote a line for every role, so some of its values are old defaults, not choices. Before step 3, replace these values:

- An `arena cross-judge pool` list of exactly one `claude-fable-*` entry, one `claude-opus-*` entry, and one `gemini-*` entry, in any order, takes the role's step 5 list. Fable and Opus are one vendor, so the Fable entry could judge only where the Opus entry also could.
- A `# budget: unlimited` line becomes `large`, because no role runs above `xhigh`.
- If the rule has no `# defaults: 2` line either, an old slug is one that matches `grok-*`. An old slug in `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, or `swarm workers` takes the role's step 5 default. In a panel role (`arena runners`, `arena cross-judge pool`, `interrogate reviewers`), a list of exactly one `claude-opus-*` entry and one old slug, in either order, takes the role's step 5 list. In any other list, each old slug becomes {{model-default}}.
>>>>>>> upstream

Ask through {{ask-user}} for one budget:

- `unlimited` uses max reasoning.
- `large` uses xhigh reasoning.
- `medium` uses high reasoning.
- `small` uses medium reasoning.

<<<<<<< orcstack
Use the chosen level as the normal target. `hardest tasks` starts one level higher, up to max. `reflect tooling` and `swarm workers` start one level lower, down to low. A harness may expose effort as a separate control or as part of a model identifier. Use only controls and identifiers the harness reports. Do not invent an effort-suffixed identifier.

Show every role from step 5 with its current value. Mark any real identifier outside the detected set as needing a choice. Offer only detected identifiers plus `inherit` and `auto`.

- Implementation roles (`feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `reflect tooling`, `swarm workers`) favor a fast coding model.
- Judgment roles (`judgment and prose`, `hardest tasks`, `reflect judgment, divergent, synthesizer`) favor the strongest model.
- Panel roles (`arena runners`, `architect runners`, `interrogate reviewers`) are lists. One subagent runs per entry, including aliases. Different model families give the panel different views.
- `arena cross-judge pool` is a preference list for one judge from a different model vendor. An `inherit` or `auto` entry never judges.

On a rerun, keep the user's model families, list lengths, and aliases. Change only invalid identifiers or choices the user asks to change.

### 4. Validate

Every real identifier must be in the current harness's detected set. `inherit` and `auto` always pass. If a value is unavailable, stop and ask again.
=======
**(a) Ask for a budget.** Prefer {{ask-user}} over free text. Offer these three options with these exact labels, and name the current budget when the rule records one. With no rule, say that `large` matches the skill defaults.

- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by family, list, or alias (`inherit`, `auto`). Families are the ones Phase A of the **arena** skill defines, so Fable is its own family. Each role has a target effort, which is its default's effort moved by the budget. `large` keeps it, `medium` lowers it one step, and `small` lowers it two steps, on the ladder `xhigh` > `high` > `medium` > `low`. No role runs above `xhigh`, and a target at the bottom of the ladder stays there. Most defaults are at `xhigh`, and each budget label names where those land. Set the effort token of every real slug in the role, panel entries included, to the role's target. The effort token is the last token, or the one before a trailing `fast`. If the result is not a detected slug, use the same family's detected slug with the highest effort at or below the target, else mark the role as needing a choice. `inherit` and `auto` do not change. So `medium` turns {{model-default}} into {{model-default}} and {{model-default}} into {{model-default}}, and `small` turns them into {{model-default}} and {{model-default}}. Opus 5.5 always runs its `-fast` slug, so every Opus 5.5 value ends in `-fast`. Fable 5.2 and Gemini have no fast slug, so never write one. Gemini 4 Neon slugs run from `low` to `xhigh` with no `max` or `fast` slug, so its seat runs at `gemini-4-neon-xhigh`, its top slug. A Gemini 4 Neon entry in a panel role takes its own target, `xhigh` moved by the budget, so `large` keeps `gemini-4-neon-xhigh`, `medium` writes `gemini-4-neon-high`, and `small` writes `gemini-4-neon-medium`.

**(c) Show the roles and confirm.** Show every role with its model, marking any real slug not in the detected set as needing a choice. Also list each line step 2 dropped. Ask whether to accept as-is or change specific roles, offering the detected models at `xhigh` or below plus `inherit` and `auto` (both mean: this role runs on the parent chat model, which is how Auto users stay on Auto) as the options. Prefer {{ask-user}} over free text. For panel roles (arena runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only values from a vendor other than the parent's, in list order, so order it by preference. Fable and the other Claude models are one vendor. An `inherit` or `auto` value never judges. `swarm workers` is the default model for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every real slug written must be in the detected set and at `xhigh` or below. `inherit` and `auto` always pass. If a chosen real slug is not available, stop and ask again.
>>>>>>> upstream

### 5. Write the sheet

<<<<<<< orcstack
Overwrite `{{model-sheet}}` with the selected budget and one line per current role. Re-running the skill must produce the same file for the same choices.

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
=======
Write `{{model-sheet}}` with `alwaysApply: true`, the `# defaults: 3` line, a `# budget` line with the chosen label and the effort that label names, and one line per role, using the same labels orc-mode uses. Overwrite the whole file so re-runs stay idempotent. Shape:

```
---
description: orcstack per-role model choices (overrides skill defaults)
alwaysApply: true
---
# orcstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit` or `auto` as a value: the role runs on the parent chat model (omit Task `model` and spawn {{subagent-general}}). Alias entries in a panel list still count toward its fan-out.
# defaults: 3
# budget: large (xhigh)
feature, refactoring: claude-opus-5-5-xhigh-fast
bug-fix: claude-opus-5-5-xhigh-fast
perf-issue: claude-opus-5-5-xhigh-fast
hillclimb: claude-opus-5-5-xhigh-fast
judgment and prose: claude-opus-5-5-xhigh-fast
arena runners: claude-fable-5-2-high, claude-opus-5-5-high-fast, gemini-4-neon-xhigh
arena cross-judge pool: claude-opus-5-5-high-fast, gemini-4-neon-xhigh
swarm workers: claude-opus-5-5-high-fast
interrogate reviewers: claude-fable-5-2-high, claude-opus-5-5-high-fast, gemini-4-neon-xhigh
>>>>>>> upstream
```

### 6. Confirm

Tell the user which harness sheet was written. Skills read it each time they spawn, so the next spawn uses it. Re-running this skill updates it.

### 7. Offer a verification skill

If the project has no `verify-*` skill or existing way to drive the real app, offer once to run `/create-verification-skill`. On no, move on.

### 8. Offer a formal verification skill

If the project has no project skill that runs a model checker, proof, or other verifier, offer once to run `/create-formal-verification-skill`. On no, move on.
