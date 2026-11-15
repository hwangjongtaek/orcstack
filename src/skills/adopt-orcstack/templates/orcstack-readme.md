# Project extensions for orcstack

This directory holds this project's changes to orcstack. The orcstack plugin is never edited, so updating orcstack keeps everything here. Declare every change in `config.json`; files it points at live under this directory. Decision record: [orcstack ADR-0004](https://github.com/hwangjongtaek/orcstack/blob/main/docs/adr/0004-project-extensions.md), in the orcstack repository, not this one.

```json
{
  "version": 1,
  "records": {
    "ssot": "docs/product/README.md",
    "adr": "docs/adr",
    "briefs": "docs/briefs"
  },
  "playbooks": {
    "visual-parity": "off",
    "bug-fix": { "extend": "playbooks/bug-fix.md" },
    "feature": { "replace": "playbooks/feature.md" },
    "data-migration": { "add": "playbooks/data-migration.md", "when": "A schema or data migration across environments." }
  },
  "skills": {
    "statechart": "off",
    "tdd": { "extend": "skills/tdd.md" }
  }
}
```

| Value | Playbooks | Skills | Effect |
|---|---|---|---|
| `"off"` | yes | yes | orc-mode never routes to it |
| `extend` | yes | yes | orc-mode reads the bundled file, then this file. Its steps come after the bundled steps, and it wins where the two conflict |
| `replace` | yes | no | orc-mode opens this file instead of the bundled one |
| `add` | yes | no | A new playbook. `when` is the sentence orc-mode matches tasks against |

`records` tells orcstack where this project already keeps its Planning SSOT, ADRs, and briefs. Leave it out to use `docs/planning/SSOT.md`, `docs/adr`, and `docs/briefs`. ADR numbers continue the width the existing ADRs use.

Names are the bundled file names: a playbook's file under `orc-mode/playbooks/`, or a skill's directory. To replace or add a skill, turn the orcstack skill off and put a project skill where your harness reads project skills.

Rules:

- `orc-mode` and `adopt-orcstack` cannot be turned off or extended, and the `opening-a-pr` playbook cannot be turned off. They hold the rule that orcstack does not run alongside SDD, Spec Kit, or Superpowers.
- Extensions apply when orc-mode routes the task. A skill the user invokes directly by its slash command runs as bundled.
- `node .orcstack/check-no-sdd.mjs` checks this file in CI. After updating orcstack, run `adopt-orcstack guard` again so `catalog.json` lists the new playbook and skill names.
