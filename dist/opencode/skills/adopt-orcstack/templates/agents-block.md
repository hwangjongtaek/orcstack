<!-- orcstack:begin -->
## orcstack

This repository is orcstack-governed: see `<cutover-adr>`. Do not edit this block by hand: re-run `adopt-orcstack scaffold` to refresh it.

**Route.** Honor WORKFLOW_STACK or the closest .workflow-stack.json first. If multiple workflow plugins are present without an explicit selection, ask the user which one to use and wait before routing. Before a task that changes code or documents, load the `orc-mode` skill from this plugin's absolute path and follow it. Resolve sibling skills within the same plugin. It runs the orcstack gate and picks the playbook. Skip it for questions that change nothing. `ORCSTACK_AUTO_ACTIVATE=0` turns this off.

| Record | Where | Rule |
|---|---|---|
| Product intent | `<ssot>` | Change it before you implement new intent. The owner approves |
| Decisions | `<adr>/` | Never edit an accepted ADR. Supersede it with a new one |
| Change briefs | `<briefs>/` | Every change starts from one: the SSOT section it serves, and acceptance marked 🔒 guard or 📎 evidence |
| Project changes to orcstack | `.orcstack/config.json` | Turn off, extend, replace, or add playbooks here. Never edit the orcstack plugin |

**Verify.** <verify>

## Never

- Create SDD, Spec Kit, or Superpowers documents (`specs/**/requirements.md`, `.specify/`, `docs/superpowers/`), or follow another workflow router such as pstack's `poteto-mode`.
- Edit frozen copies under `docs/archive/`, or commit framework documents git ignores.
<tdd-rule>
<!-- orcstack:end -->
