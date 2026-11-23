### Opening a PR

Invoked at the end of every other playbook.

Work from a git worktree off trunk, and keep unrelated work out of it. Rebase into small, landable commits. Run the slop-strip pass (the Before commit route in `SKILL.md`) over the diff before commit and `/no-comments` before review.

Title: `type(scope): subject`, naming a real symbol when one carries the change. Body: a one-minute briefing under 40 lines with these `##` headings in order, dropping empty ones: `## Intent` (in a orcstack-governed repository, the SSOT section and the brief path in one line, per `references/records.md`), `## Why`, `## What changed`, `## Scope`, `## Tradeoffs` (only rejected alternatives a reviewer would otherwise ask about), `## Blast Radius`, `## Verification`. With a brief, `## Verification` is one line per acceptance item instead: its permanent guard (the test path) or its one-off evidence. An item with no permanent guard states why, the residual risk, and who approved it.

Write the PR title, description, and commit body with `/technical-writing`, then apply `/unslop`.

Use GitHub CLI (`gh`) for create, edit, view, watch, and merge. Do not require Graphite (`gt`). Stack follow-ups by base branch. Open PRs ready, with `gh pr create` without `--draft`. Opening a PR does not start a babysit.
