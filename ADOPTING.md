# Adopting orcstack in a project

This file is for a coding agent that was given this repository and asked to move a target project onto orcstack. It is the map. The procedure lives in the `adopt-orcstack` skill, and the people you work for make the decisions. People reading about orcstack start at [README.md](README.md). Decision record: [ADR-0006](docs/adr/0006-agent-adoption-entry.md).

Follow the steps in order. At every **Ask**, stop and wait for a person's answer. Do not answer for them, and do not take silence as approval.

## The one rule

orcstack does not run alongside another workflow framework: SDD (`sdd-helper`), Spec Kit, Superpowers, or pstack's `poteto-mode` routing. A cutover replaces the old router, keeps the old documents frozen and read-only, and carries product intent into the Planning SSOT. It happens at a milestone boundary, never in the middle of work the old framework is driving.

## Steps

Run every command from this repository's root. `<repo>` is the target project's path. Tools need node 22 or later.

1. **Preflight.** Run `node tools/orcstack.mjs preflight --target <repo>`.
   - It reports the target's git state, the harnesses it is set up for, whether it is already orcstack-governed, the framework artifacts, and the record layout it already has.
   - `unsupportedHarnesses` lists harness settings orcstack does not ship for. Upstream pi (`.pi/`) is one: orcstack ships for oh-my-pi only (SSOT §5), so preflight asks whether pi users move to oh-my-pi.
   - `detect.nested` lists subdirectories that are other repositories, such as worktrees under `.claude/worktrees/`. Their files are not counted.
   - **Ask** every item in `decisions`. Each one has a question and the evidence. Typical decisions: the milestone boundary, which file is the SSOT, approval to replace other routers' lines, which intent in git-ignored local documents moves to the SSOT, and whether pi users move to oh-my-pi.
2. **Read the procedure.** Open `dist/<harness>/skills/adopt-orcstack/SKILL.md` for the harness you run in (`claude-code`, `codex`, `omp`, or `opencode`). That build names your own tools. Where the skill says to run `scripts/adopt.mjs <step>`, run `node tools/orcstack.mjs adopt <step> ... --target <repo>` instead. It runs the same script against the target.
3. **Cut over, in the skill's order.**
   1. `adopt records --ssot <file> [--adr <dir>] [--briefs <dir>]` with the SSOT the person chose in step 1.
   2. **Ask** for approval before `adopt freeze --milestone <m>`, because it moves files. A document git ignores stays in place and shows up as `leftIgnored`. A tracked document moves even when a `.gitignore` pattern matches it, because git already tracks it.
      - `references` lists lines that still point at moved paths. Fix the `live` ones (instruction files, templates, operating docs) in the cutover PR. Leave the `history` ones (changelogs, ADRs) as they are; they record the past.
   3. Carry the intent from the frozen documents into the SSOT as proposals. **Ask** the SSOT owner to keep, change, or drop each group.
   4. Replace other routers' lines only after approval. Show the before and after.
   5. `adopt disable`, then `adopt scaffold --milestone <m>`, then `adopt guard`. `scaffold` reports `agentsConflicts`: lines outside the orcstack block in `AGENTS.md` that contradict it. Treat them like the routing lines in step 4.
   6. Fill the cutover brief and the cutover ADR. They are in the target's brief and ADR directories, named `adopt-orcstack`. Follow the target's ADR conventions.
4. **Verify.** Run `node tools/orcstack.mjs verify --target <repo>` until `ok` is true. Every failing check names what is missing.
   - A check marked `awaiting` fails only because a decision is still waiting for approval, such as `routing-lines`. Do not work around it. Report it as pending, and say that the target's CI guard fails until the decision is made.
   - `legacyAdrProblems` lists format problems in ADRs written before the cutover. They do not fail the cutover. Report them, and propose a separate fix that never rewrites an accepted decision.
5. **Cold-start review.** Run the `cold-start-review` skill (`dist/<harness>/skills/cold-start-review/SKILL.md`) with a reviewer that has no part in this session. Fill each unanswered question with the target's own records, then run the review once more.
6. **Open the cutover PR in the target.** Work on a branch. **Ask** before you push or open the PR. The PR body lists:
   - what moved
   - what went into the SSOT
   - what stayed frozen
   - the decisions and who made them
   - the manual steps that remain
7. **Install orcstack for the team.** Tell the person which harnesses the target uses (from preflight). `node tools/orcstack.mjs install --harness <name>` prints the steps for one harness. It creates the opencode link only with `--apply`, and only after the person agrees. The other harnesses' commands are for the person to run.

   | Harness | Install | Routing |
   |---|---|---|
   | Claude Code | `/plugin marketplace add hwangjongtaek/orcstack`, then `/plugin install orcstack@orcstack` | SessionStart hook, plus the `AGENTS.md` block |
   | Codex | `codex plugin marketplace add hwangjongtaek/orcstack`, then `codex plugin add orcstack@orcstack` | The `AGENTS.md` block. The hook runs only after the person trusts it in the TUI |
   | oh-my-pi | `omp plugin marketplace add hwangjongtaek/orcstack`, then `omp plugin install orcstack-omp@orcstack --scope=project` | The `AGENTS.md` block (omp does not run the hook) |
   | opencode | From a orcstack checkout: `node tools/orcstack.mjs install --harness opencode --apply` (one link into opencode's skills directory; update with `git pull`) | The `AGENTS.md` block |

   The repository is private. Each person needs read access to `hwangjongtaek/orcstack` and a Git login on their machine.

## Never

- Edit files under `dist/`, or the orcstack plugin installed in a harness. Project changes go in the target's `.orcstack/config.json`.
- Commit framework documents git ignores. They are someone's private records.
- Edit an accepted ADR. Supersede it with a new one.
- Push, open a PR, change branch protection, or touch a person's global harness settings without their explicit approval.
- Turn another workflow framework back on to finish a step faster.
