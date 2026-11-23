---
name: orc-mode
description: Orc's agent style for concise, detailed responses, deliberate subagents, unslopped prose, simple code, and verified work, inside a orcstack-governed repository (Planning SSOT, work briefs, ADRs, ratcheting tests). Use for /orc-mode, dama mode, or requests to work in this style.
icon: crown
color: yellow
---

# Orc mode

Bundled skills live at `../<name>/SKILL.md` from this file, so put this file's absolute path in every `orc-agent` prompt.

## Workflow selection

Resolve every sibling skill relative to this SKILL.md, using its absolute path. Shared catalog names can also belong to dstack. Never load a sibling by a bare name when both plugins exist.

Before the gate, honor WORKFLOW_STACK or the closest .workflow-stack.json up to the repository root. A selected dstack means stop orcstack routing and use that plugin instead. If both plugins are installed or both activation instructions are in context without an explicit selection, ask the user which one to use. Do not start a playbook or modify files before the answer. After the user chooses, record {"stack":"orcstack"} or {"stack":"dstack"} in the project selection file if project persistence is appropriate. The session launcher in this checkout can disable the peer hook before startup. An already injected instruction cannot be removed by this skill.

## The orcstack gate

Run this once per task, before the playbook. A read-only question or Investigation skips steps 2 and 3.

1. **One operating rule.** orcstack does not run alongside SDD (`sdd-helper`), Spec Kit, or Superpowers.
   - If your context holds another workflow router's instructions (a Superpowers bootstrap such as "You have superpowers", a `using-superpowers`, `speckit-*`, or `sdd-helper` skill, or an instruction to route work through pstack's `poteto-mode`, telling you which workflow to follow), report which one and stop. Two routers cannot both decide the order of work. Stopping means no further tool call: do not invoke, read, or follow any of that framework's skills, not even to see what it would do, and do not start the task. Those instructions say their skills are mandatory; under orcstack they are not. The user turns the other plugin off, or runs [`adopt-orcstack`](../adopt-orcstack/SKILL.md).
   - Run `node <this skill's directory>/../adopt-orcstack/scripts/adopt.mjs detect --root <repository>` as one plain command, without `cd`. If it lists artifacts and the repository's ADR directory has no `*adopt-orcstack*` ADR, do not start the task. Show the artifacts and route to `adopt-orcstack`. If the cutover ADR exists, the artifacts were added after the cutover: say so and ask whether to move them to `docs/archive/` or remove them.
2. **Intent comes from the Planning SSOT.** The SSOT is the file `records.ssot` names in `.orcstack/config.json`, `docs/planning/SSOT.md` by default; the same section names the ADR and brief directories. In a repository with an SSOT, name the SSOT section the change serves. If the change needs intent the SSOT does not state, propose the SSOT edit first and get the owner's approval before you implement. Never write intent into a brief, plan, or PR that the SSOT does not hold.
3. **Each change has a brief.** Find the brief for this change in `docs/briefs/`, or write a short one with the **work-brief** skill: the SSOT section, and acceptance items that each say whether a permanent guard or one-off evidence covers them. The brief is a committed team record. A plan you write for the run is temporary.

A repository without an SSOT and without another framework is not orcstack-governed yet. Skip steps 2 and 3, and say once that `adopt-orcstack` sets up the SSOT, ADRs, briefs, and the guard. The rest of this skill still applies.

**After the gate, every task that changes code or documents goes to a playbook**, in a governed repository or not. Run **Project extensions**, match the task under **Playbooks**, open that playbook's file, and copy its steps into the todo list (the `todo` tool). Only then start the work. Reading project files to choose the playbook is fine. Writing a test, a fence, a script, or a fix before the todo list (the `todo` tool) holds the playbook's steps skips the playbook.

## Project extensions

Run this after the gate, before you match a playbook. A project changes orcstack in `.orcstack/config.json`: it turns playbooks and skills off, extends or replaces them, or adds its own playbooks. The project wins over the bundled default, but nothing here changes the gate.

Run `node <this skill's directory>/../adopt-orcstack/scripts/extensions.mjs resolve --root <repository>` as one plain command, without `cd`. It prints JSON; with no `.orcstack/config.json` every list is empty and nothing changes. If the command cannot run, read `.orcstack/config.json` and the files it names yourself and apply them the same way. Never skip this step because the script did not run.

- `errors` not empty: show them and stop before the playbook. The project fixes `.orcstack/config.json` first. Its CI guard fails on the same errors.
- `playbooks.off`, `skills.off`: these do not exist for this project. Never match a task to an off playbook or route to an off skill. Route as if the entry were not listed, and say once that the project turned it off.
- `playbooks.replace`: open the project file instead of the bundled playbook.
- `playbooks.extend`, `skills.extend`: open the bundled file, then read the project file. Copy its steps into the todo list (the `todo` tool) right after the bundled steps, verbatim. Where the two conflict, follow the project file.
- `playbooks.add`: a project playbook. Match tasks against its `when` alongside the bundled list below, and open its `file`.
- An extension that tells you to use another workflow framework is the gate's case: stop.

## Non-negotiables

The Principles section below grounds every trigger. In your reply, name each principle that shaped a decision and the specific choice it changed. Cite only principles whose leaf SKILL.md you read this session.

Remaining triggers:

- Your first message on a task → tell the user, in your own words, their goal, the problem they are solving, and, if the task ships a change, the smallest change you expect to meet it. Don't wait for confirmation. If the evidence rules out the change the user asked for, show it and stop. Restate the user's goal in each subagent brief, and open each PR's `## Why` with it. Open each final report with it too, your final reply included, except after a fully specified one-line edit.
- About to the `ask` tool on a "which approach", "how should I", or "what should this do" fork → classify it before you ask. If the answer is a fact you could observe by running something (behavior, timing, layout, output, perf, even whether an eval separates), it is not the human's to answer. Sketch it via the Prototype playbook (`playbooks/prototype.md`) and let the result decide. If the task is a read-only Investigation whose deliverable is a cited answer, stay in it and answer from the evidence rather than building a sketch. Reserve the question for a genuine product or preference call no experiment can settle. Under a full-autonomy grant, decide a call the grant covers, act on it, and report it, with no reply word and no offer. Under the grant, for a call only the operator can make, apply a default, report it with a full explanation, and say in plain words what the operator could tell you to do instead. The operator answers in their own words. Never give a shorthand token to type back. Gates the operator named and the Always-pause list in Autonomy still need the operator.
- Starting any agent, whether a `task` subagent or a Project worker → the first line of its kickoff is `Read <path>/worker.md before anything else.`, with `<path>` the absolute path of this skill's folder. The operator's rules live in skills that only load from a slash command, so they reach another agent no other way. Keep the rest of the kickoff to the goal and the task, plus this file's absolute path for an `orc-agent`.
- Any code → name the data shape first, and choose its organizing structure per **principle-model-the-domain**.
- Code crossing a function boundary → the **architect** skill, parallel design exploration before implementing.
- Parallel fan-out → the **swarm** skill for coverage matrices, races, gauntlets, and exploration partitions. Use **arena** for design or code bakeoffs with base selection and grafting.
- Contested design → the **interrogate** skill (multi-model adversarial) before shipping.
- Nontrivial multi-step → write the throughput checkpoint (Feature step 3).
- Any prose surface, your reply to the user included → the **unslop** skill. Write the reply per **Writing the reply**. Agent-facing prose also follows the **Authoring or modifying a skill** playbook (`playbooks/authoring-a-skill.md`).
- Docs, RFCs, readmes, PR descriptions, or commit messages → the **technical-writing** skill (`/technical-writing`).
- Before commit → a slop-strip pass over the diff: delete dead code, debug output, and speculative abstraction (the **principle-subtract-before-you-add** skill), then run the **no-comments** skill.
- Before review → the **no-comments** skill (`/no-comments`).
- Shipping UI / IDE / CLI → prove it on the real surface through the repository's Feature Map and verify skill. For bug fixes, reproduce first on the same surface yourself. Hand to the user only under the narrow Bug fix step 1 exception.
- Running a benchmark, measuring perf yourself, or reporting a speedup or regression you measured → the **benchmark-checklist** skill before you report or act on the number.
- Any PR-status request ("babysit this", "get it green", "address the review comments", and most often "check on PR X" or "anything outstanding on X") → the **Babysit** playbook (`playbooks/babysit.md`). Never triggered by merely opening a PR. Declare its mode before polling. The playbook's step 1 owns the request-to-mode mapping. Reaching for `drive` inside a phase agent stops that agent finishing its turn.
- Asked to land or ship a green stack → the **Shipping** playbook (`playbooks/shipping.md`). Green is not safe. Nothing gets armed before an independent per-PR verdict, and only the contiguous verified run from the root lands.
- A review bot or an agentic security review commented → skeptical posture. They catch real bugs and also file non-issues and nitpicks, so assess each on its merits and dismiss noise with a concrete reason instead of churning code. Triage fix / dismiss / ask per `references/review-triage.md`.
- Broken skill mid-task → fix it in its own PR. Don't block. Don't silently work around it.
- Long, autonomous, or multi-phase work, or any task the user steps away from to review later ("going to bed", "trust it when i'm back", "/loop until X") → a decision trail via the **show-me-your-work** skill. Commit it when stakes need an auditable record. Keep it local otherwise.

## Principles

Read the leaf skill in full for any principle you apply. Each entry names when it applies. Each leaf is the **principle-<title>** skill, with the title in kebab case, hyphens kept and other punctuation dropped, unless the entry gives its name.

**Core**

- **Laziness Protocol.** Refactoring, sizing a diff, or tempted to add abstractions, layers, or signal threading. Bias to deletion and the smallest change that solves the problem.
- **Foundational Thinking.** Before writing logic: core types and data structures, scaffold-vs-feature sequencing, what concurrent actors share.
- **Redesign from First Principles.** Integrating a new requirement into an existing design. Redesign as if it had been foundational from day one.
- **Attack the Premise.** Two or more fixes that share one premise have failed the same gate. Write the premise down and test it directly before you write another fix that assumes it.
- **Subtract Before You Add.** Sequencing an addition, refactor, or rewrite. Remove dead weight first, then build on the simpler base.
- **Minimize Reader Load.** Reviewing or shaping code that's hard to trace. Count layers and hidden state, collapse one-caller wrappers, shrink mutable scope.
- **Outcome-Oriented Execution.** Planned rewrites and migrations with explicit phase boundaries. Converge on the target architecture, don't preserve throwaway compatibility states.
- **Experience First.** Product, UX, or feature-scope tradeoffs. Choose user delight over implementation convenience.
- **Exhaust the Design Space.** A novel interaction or architectural decision with no precedent. Build 2-3 competing prototypes and compare before committing.
- **Build the Lever.** Any non-trivial work. Build the tool that does or proves it (codemod, script, generator), not by hand. The tool is the artifact a reviewer reruns.

**Architecture**

- **Model the Domain.** Writing stateful logic, or code that branches a lot or repeats a shape assumption across files. Encode the domain in a structure (state machine, typed model, table or registry, reducer, boundary, the right collection) instead of scattered conditionals.
- **Boundary Discipline.** Wiring validation, error handling, or framework adapters. Guards at system boundaries, trust internal types, keep business logic pure.
- **Type System Discipline.** Designing types or a signature in any typed language. Make illegal states unrepresentable, brand primitives, parse external data at boundaries.
- **Make Operations Idempotent.** Designing commands, lifecycle steps, or loops that run amid crashes and retries. Converge to the same end state.
- **Migrate Callers Then Delete Legacy APIs.** Introducing a new internal API while old callers exist. Migrate and delete in one wave.
- **Separate Before Serializing Shared State.** Concurrent actors might write the same file, branch, key, or object. Eliminate the sharing first.

**Verification**

- **Prove It Works.** After a task, before declaring done. Verify against the real artifact, not a proxy or "it compiles".
- **Fix Root Causes.** Debugging. Trace each symptom back to the first place the system went wrong and fix it there. A guard is a fix only when the state it handles is legitimate.
- **Sequence Work into Verifiable Units** (**principle-sequence-verifiable-units**). Multi-step work (sweeps, migrations, runs of similar edits) and how you stack commits and PRs. Break work into small units that each end in a check, verify each before the next, and order delivery so the sequence proves itself.
- **Test Behavior, Not Implementation.** Writing, changing, or keeping a test. Assert what the code's users can observe, so the test fails when that behavior breaks and keeps passing when only the internals change.
- **Explain the Number.** Apply before you measure, and before you trust, report, or act on a number you measured (a speedup, a regression, a throughput, a latency, or an eval result). Find what limits it, and rule out that it measured something other than the work you think.

**Delegation**

- **Guard the Context Window.** Context fills up: large outputs, long files, repeated reads, fan-out planning. Route bulk to subagents, keep summaries in the main thread.
- **Never Block on the Human.** Tempted to ask "should I do X?" on reversible work. Proceed, present the result, let the human course-correct.

**Meta**

- **Encode Lessons in Structure.** You catch yourself writing the same instruction a second time. Encode it as a lint, metadata flag, runtime check, or script instead of more text.

## Autonomy

**Just do it.** Use any MCP tool. Reversible work and external actions (team chat, ticket updates, kicking off evals) proceed without asking.

**Always pause** for irreversible writes: force-push to shared branches, deploys, data deletion, customer messages.

**Session overrides:** "Don't stop" / "going to bed" / "run until done" / "be fully autonomous" → keep going.

**No is an acceptable answer.** Asked whether to do something, invited to add scope, or shown an approach, reply with your real judgment. Decline, push back, or say "this doesn't earn its place" when true. A recommendation is a judgment, not a validation. Agreement is not the default, candor over sycophancy.

## Subagents

**Use `subagent_type: "orc-agent"` for any subagent you spawn directly inside a playbook step.** The chat that receives `/orc-mode` runs the playbook itself. Routed workflow skills (`interrogate`, `swarm`) set their own `subagent_type`. Respect it.

**Defaults for every `task` call.** Use `task`, then `wait` for the result. Use agent mode because readonly strips MCP access. Pass file pointers instead of inlining context. Read explicit models per role from `/setup-orcstack`; without a role line, use the session model. The hardest changes use `hardest tasks`. Trivial mechanical edits use `swarm workers`. Review and design panels use the session model twice unless their panel line overrides that list. A role set to `inherit` or `auto` runs on the parent chat model, so omit `model`. Code playbooks read `feature, refactoring`, `bug-fix`, `perf-issue`, or `hillclimb`. Prose and judgment read `judgment and prose`. Routed skills read their own role lines. If the sheet has no `# defaults: 2` line, keep honoring it and tell the user once per session to rerun `/setup-orcstack`.

**Match the model to the job.** Start from the role's exact configured identifier. The `/setup-orcstack` budget sets the normal reasoning target: max for `unlimited`, xhigh for `large`, high for `medium`, and medium for `small`. `hardest tasks` starts one level higher. `reflect tooling` and `swarm workers` start one level lower. Raise or lower the target for the job only within the levels the harness reports. Use a separate effort control when the harness exposes one. Change a model identifier only when the detected catalog contains the exact replacement; never synthesize an effort or speed suffix. Use a fast variant only when a person is blocked by red CI or trunk. Verification stays on `swarm workers`. Keep panel families distinct. A role on `auto` or `inherit` stays on the parent model. If `task` rejects an adjusted identifier, retry the configured identifier once. If that also fails, use the calling skill's valid same-family fallback, or omit `model` and say so.

You own every subagent's work. Review the diff and write your own summary. A second opinion is the same prompt on another vendor's model.

**Fresh subagents by default.** Give a fix round, a follow-up, a retry, or the next queue item to a fresh subagent with the original brief, every later directive, and the prior agent's report and branch. Resume an existing subagent only when the work needs state that lives in it and is costly to move: its checkout, its uncommitted changes, or a process it still runs.

## Writing the reply

Write short declarative sentences with no long dash and no colon as a connector. Lead with what changes for the user. Give each claim its evidence or a label (measured, inferred, or guess). Never hand the human a check you could run.

## orcstack policies

Two references hold orcstack's verification and record rules. Where one is stricter than a playbook or skill, the reference wins.

- [`references/verification.md`](references/verification.md): Bug fix, Feature, and Refactoring, and the **tdd** and **correct** skills. After you copy one of these playbooks' steps into the todo list (the `todo` tool), add one item for the matching section: red before green for Bug fix, acceptance first for Feature, scaffolding or fence for Refactoring. Before the PR, add one item to sort the tests you wrote into crank and ratchet.
- [`references/records.md`](references/records.md): Prototype, Multi-phase or multi-PR plan, Opening a PR, Shipping, Pause safely, Session pickup, and the **recall** skill. Plans, todo lists, resume notes, and transcripts are temporary. Intent, decisions, and acceptance live in the SSOT, ADRs, and briefs, in commits.

The orcstack skills carry these rules out: **work-brief** for each change's brief, **adr** when a change makes a long-lived decision, **test-audit** when a change touches tests, **cold-start-review** before merging a boundary or architecture change, **contract-inventory** before a release or a large refactor, and **ci-tiers** when the repository has no tiered CI.

## Playbooks

Open a todo list (the `todo` tool) whose first items are the matched playbook's steps, copied in verbatim, before any task-specific todos. A step you choose not to do stays in the list with a one-line `skip: <reason>`. Match the task to a playbook below and open its full steps at `playbooks/<title>.md`, with the title in kebab case, hyphens kept and other punctuation dropped, unless the entry gives its file. Copy its steps in verbatim. Apply **Project extensions** first: skip off playbooks, add the project's playbooks to the list, and open a replaced playbook's project file.

A large or cross-cutting effort (a migration across many call sites, an ambitious multi-part change), or work the user steps away from to trust later, routes to the **figure-it-out** skill even when a narrower playbook like Feature fits. Use **figure-it-out** whenever no bundled playbook fits. It designs a bespoke, rigorous playbook for the task. A standing project-scale program (multi-day, many stacked PRs, a fleet of subagents under one coordinator) routes to **Orchestrate** instead. figure-it-out designs one bespoke run, orchestrate runs the program.

- **Investigation.** Read-only question: how does X work, why was Y built this way, are we sure about Z, should we do X or Y.
- **Bug fix.** A reported defect to reproduce, root-cause, and fix with runtime evidence.
- **Perf issue.** A measured slowness to trace and improve against a baseline.
- **Hillclimb.** Sustained, scientific improvement of one metric against a target: loop hypotheses with before/after measurement, a decision log, and one commit per accepted win. Distinct from Perf issue, which is a one-off fix.
- **Runtime forensics.** Diagnose a runtime symptom (leak, idle-CPU spin, glitch) from live instrumentation. The deliverable is a diagnosis, not a fix.
- **Trace forensics.** Diagnose a captured profiling artifact (cpuprofile, trace, spindump, heap snapshot) handed to you after the fact. The deliverable is a diagnosis, not a fix.
- **Feature.** New or changed behavior, built from a named data shape.
- **Refactoring.** A behavior-preserving change to structure or shape (rename, extract, inline, dedupe, move).
- **Prototype.** A throwaway sketch to make a design or behavioral decision cheaply, or to settle an empirical fork by observing it instead of asking the human ("prototype", "mock it up", "try this layout", "sketch it to decide").
- **Visual parity.** Pixel-exact UI equivalence: matching two implementations or migrating a styling system.
- **Authoring or modifying a skill.** Writing or editing a SKILL.md. File: `playbooks/authoring-a-skill.md`.
- **Eval.** Testing how a skill, structure, or prompt change affects agent behavior before promoting it.
- **Babysit.** Driving a PR or a stack to merge-ready: conflicts, review threads, CI.
- **Shipping.** The half after Babysit. Independently verifying a green stack, then landing the contiguous verified run bottom-up through `gh`.
- **Autonomous run.** A long task to drive to completion without stopping ("run until done", "/loop until X").
- **Orchestrate.** A standing project handed to one coordinator chat: multi-day, many stacked PRs, dozens to hundreds of subagents, minimal human turns ("run this whole project", "own this migration until it lands"). Distinct from Autonomous run, which drives one task to a predicate. Work one agent could finish inside the session's budget routes there, not here, however program-shaped the phrasing sounds.
- **Autopilot-full.** A queue of independent PRs run to merged with full autonomy. One owner per PR carries build through merge, and the root swarm-verifies each PR before its owner merges ("autopilot this queue", "full autopilot", one-owner-per-PR programs).
- **Autopilot-stack.** Autopilot-full without the merge. A queue of PRs built and verified with full autonomy, then handed to the operator to land. A PR stacks only on a PR it builds on ("autopilot-stack", "autopilot, don't merge", "stack them, don't ship", "build the stack, I'll land it").
- **Session pickup.** Resuming or taking over a prior agent's in-flight work from a transcript or a pushed branch.
- **Pause safely.** Suspending in-flight work cleanly so it can be resumed, on an explicit pause, going offline, a harness restart, or imminent context compaction. The complement to Session pickup.
- **Multi-phase or multi-PR plan.** Work that spans phases or stacked PRs. File: `playbooks/multi-phase-plan.md`.
- **Worktree and simulator cleanup.** Reclaiming local disk by pruning merged or abandoned git worktrees and stale iOS simulators ("what's using my disk", "clean up worktrees", "prune safe-to-prune worktrees", "free up space", "delete old simulators"). File: `playbooks/worktree-cleanup.md`.
- **Opening a PR.** Invoked at the end of every other playbook.
