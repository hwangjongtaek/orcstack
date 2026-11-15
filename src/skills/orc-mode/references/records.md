# Flow and records policy

orcstack's rules for what is temporary and what is kept. They apply to every playbook that plans, prototypes, ships, pauses, or resumes work, and to the **recall** skill.

## Persistent records and temporary state

| Record | Holds | Lifetime |
|---|---|---|
| The Planning SSOT (`docs/planning/SSOT.md`, or the path `records.ssot` names in `.orcstack/config.json`) | Product intent: what the product must do, for whom, and what failure costs | Persistent. Change it before implementing new intent |
| `docs/adr/` | Long-lived or costly-to-reverse decisions, with the alternatives and the revisit condition | Persistent. Supersede, never overwrite, an accepted ADR |
| `docs/briefs/` | One change: the SSOT section it serves and its acceptance items | Persistent, committed with the change |
| Plans, todo lists, resume notes, transcripts | How one run gets done | Temporary. Never a source of truth |

A decision that should outlive the session goes into a commit: an ADR for a lasting decision, the brief for one change, the SSOT for intent. A decision left only in a transcript, a plan file, or a resume note is lost to the next agent.

## Prototypes never merge

A prototype answers a question. Its code is throwaway and never lands. Keep it in a scratch directory or a branch named for the prototype. What lands is the decision: in the brief of the change that follows, or in an ADR when it is long-lived. The real build goes through Feature.

## Plans are temporary

A multi-phase plan drives one program. It does not hold intent. When a plan needs intent the SSOT lacks, propose the SSOT change first. Each PR the plan names still gets its own brief.

## PR bodies

In a orcstack-governed repository the body opens with `## Intent`: the SSOT section and the brief path. `## Verification` lists each acceptance item of the brief with its guard (the test path) or its one-off evidence. An item without a permanent guard states why, the residual risk, how it was verified, and who approved it.

## Independent verification does not replace CI

A verifier's PASS on the product surface is added to the required CI checks, never a substitute for them. Never land a PR whose required checks are red, whatever its verdict.

## Pause, pickup, and recall

- **Pause.** The resume note is temporary. Any decision the next agent must honor goes into a commit (brief or ADR) before you stop.
- **Pickup and recall.** Read the SSOT, the change's brief, and recent ADRs before transcripts. Where a transcript disagrees with a committed record, the committed record wins, and you say so.
