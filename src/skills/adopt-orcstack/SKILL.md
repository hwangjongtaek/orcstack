---
name: adopt-orcstack
description: Cut a repository over to orcstack from SDD (sdd-helper), Spec Kit, Superpowers, or pstack's `poteto-mode` routing at a milestone boundary. Freezes their documents, moves product intent into the Planning SSOT, turns the plugins off, records ADR-0001, and installs a guard against re-entry. Use for /adopt-orcstack, "adopt orcstack", "migrate from SDD/Spec Kit/Superpowers", or when orc-mode finds another framework's artifacts.
---

# Adopt orcstack

orcstack cannot run alongside another workflow framework. SDD, Spec Kit, and Superpowers each decide the order of work and which document is the authority, so with orcstack in the same repository there would be two routers and two sources of truth. This skill does a clean cutover: freeze the old documents, carry the product intent forward, switch the tools off, and block re-entry.

The deterministic steps run through `scripts/adopt.mjs` next to this file. Run it with `node <this skill's directory>/scripts/adopt.mjs <command> --root <repository>`. Every command prints JSON and is safe to re-run.

## 1. Detect and confirm the boundary

Run `detect`. It lists every artifact with its framework, the framework plugins enabled for the user, and whether `tdd-workflow` is enabled. A `pstack` artifact is either an enabled plugin or a `routing instruction`: lines of `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md` that send work to pstack's `poteto-mode`. orcstack is pstack's port, so a pstack repository already keeps an SSOT, briefs, and ADRs. Adopt them through `records` and replace the routing; there is little to freeze. `tmux-orchestrator` is switched off because it dispatches SDD plans. `ignored` lists artifacts git ignores, such as a gitignored `specs/`: private local records, not part of the repository. `nested` lists subdirectories with their own `.git`, such as worktrees under `.claude/worktrees/`, submodules, or nested clones. They are other repositories, so their files are not read or counted.

- No artifacts and no plugins: say there is nothing to cut over, run step 5 only (`scaffold` and `guard`), and stop.
- Otherwise show the list, grouped by framework, and ask through {{ask-user}} which milestone the cutover happens at. A cutover happens only at a milestone boundary, never in the middle of work that the old framework is still driving. If work is in flight, stop and tell the user to finish or pause it first.

`records` shows the project's existing record layout: SSOT candidates and the ADR directory with its numbering. When the project already keeps an SSOT, ADRs, or briefs somewhere, adopt them. Record their paths with `records --ssot <file> [--adr <dir>] [--briefs <dir>]` before step 5. It writes the `records` section of `.orcstack/config.json` with the version and keeps the rest, so orcstack never creates a second SSOT or restarts ADR numbering. Ask through {{ask-user}} when there is more than one SSOT candidate.

Confirm with the user before step 2, because it moves files.

## 2. Freeze

Run `freeze --milestone <name>`. It moves every artifact file into `docs/archive/<framework>/` at its original relative path, puts a FROZEN header on each Markdown file, and lists the moves in `docs/archive/<framework>/FROZEN.md`. Frozen files are read-only from now on. `freeze` never moves a file git ignores, because moving it into `docs/archive/` would commit a private record. It lists them as `leftIgnored`. `references` lists the lines elsewhere in the repository that still point at a moved file or its directory. Update the `live` ones (instruction files, templates, operating docs) in the cutover PR. Leave the `history` ones (changelogs, ADRs) as they are. Read them in step 3 for intent, then tell the user they stay local and outside the repository. The guard does not count them.

## 3. Carry the intent forward

This step is judgment. Read the frozen documents and sort what they say:

| Found in the frozen documents | Goes to | Rule |
|---|---|---|
| What the product must do for whom, and what failure costs | The SSOT (`records.ssot`) | Product intent only. Rewrite it in the SSOT's shape; do not copy requirement IDs or document structure |
| A long-lived technical decision with alternatives and a reason | A new ADR in `docs/adr/` | Only decisions that still hold and would be costly to reverse |
| A behavior that must not regress | A guard candidate in the SSOT's contracts table | Name the lowest stable layer that can hold it. Writing the test is later work, through a brief |
| Plans, task lists, step orders, constitution procedures, traceability IDs | Nowhere | They belong to the old framework's operating rule and stay frozen |

Show the user the SSOT sections, ADR candidates, and guard candidates before you write them, and ask through {{ask-user}} whether to keep, change, or drop each group. The SSOT owner approves intent. Never invent intent the frozen documents do not state; mark gaps as open questions in the SSOT instead.

## 3b. Replace other routers' instructions

For each `routing instruction`, propose replacing the listed lines with the orcstack route, and show the exact before and after. Change them only after the user approves. The orcstack block in `AGENTS.md` (step 5) carries the route itself, so most replacements are deletions. An ADR that adopted the old operating rule is superseded by the cutover ADR (**adr** skill, `supersede`), never edited. Search the rest of the documents for the old rule too (an operating-rule page, a contributing guide, a README section) and propose the same replacements.

## 4. Turn the plugins off

Run `disable`. It sets every framework plugin enabled in the project or for the user to `false` in `.claude/settings.json`, and removes Superpowers from `opencode.json`. Report the `manual` lines to the user: plugins installed for Codex or oh-my-pi live in the user's own settings, and only the user removes them. A framework bootstrap that still loads at session start means the cutover is not done.

## 5. Record and guard

Run `scaffold --milestone <name>`, then `guard`.

- `scaffold` writes the SSOT, the cutover ADR (the next number in the ADR directory, named `<number>-adopt-orcstack.md`), and the brief template at the paths `records` names, only when they are missing, and never overwrites them. It adds or refreshes one orcstack block in `AGENTS.md`, which routes work through `orc-mode` in harnesses without session hooks. The block names the record paths and the repository's verify command, and stays under 30 lines. `agentsConflicts` lists the team's lines outside the block that contradict it: another operating rule, another router, another framework's tooling. Propose a replacement for each, as in step 3b, and change none without approval. When `tdd-workflow` is enabled, the block says the orcstack `tdd` skill decides test order.
- `scaffold` also creates `.orcstack/config.json` (empty) and `.orcstack/README.md` when they are missing. The project turns orcstack playbooks and skills off, extends or replaces them, or adds its own there. Re-running `scaffold` or `guard` never rewrites them.
- `scaffold` also writes the cutover brief (`<briefs>/adopt-orcstack.md`). Fill its SSOT line, the why (the user need and failure cost behind switching now), and the rollback section, then run the **work-brief** `check`. A teammate who did not take part must be able to answer the cold-start questions from the brief and the cutover ADR.
- Make the cutover ADR follow the repository's ADR conventions: its template's headings and language, its status format, and its index (an ADR README that lists every record). The orcstack template gives the content; the repository's conventions give the shape.
- Fill in the cutover ADR: why the cutover happened, and the revisit condition. It is a falsifiable operating hypothesis, not a universal claim.
- `guard` installs `.orcstack/check-no-sdd.mjs`, the orcstack name list `.orcstack/catalog.json`, and the `orcstack-guard` CI workflow. From the moment it is installed, not from the milestone date, a new SDD, Spec Kit, or Superpowers document outside `docs/archive/` fails CI, and so does an error in `.orcstack/config.json`. The workflow runs on pull requests and on pushes to the default branch only. `guard` takes the branch from `--branch`, else from `origin/HEAD`, else assumes `main`; when `defaultBranch.source` is `fallback`, confirm the branch with the user. Run `guard` again after updating orcstack to refresh the name list and the workflow.

Run `detect` again. It must report no artifacts.

## 6. Open the cutover PR

One PR holds the frozen moves, the SSOT, the cutover ADR, the replaced routing lines, the AGENTS.md block, the plugin settings, and the guard. Run **Opening a PR** from `orc-mode`. The PR body lists what moved, what was carried into the SSOT, what was left frozen, and the manual steps the user still has to do.

## Reply

Lead with the result: frameworks cut over, files frozen, SSOT sections written, ADR candidates, guard installed. Then the manual steps, if any.
