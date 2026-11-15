### Authoring or modifying a skill

**You own the skill's voice.**

1. Draft against the Agent Skills format: frontmatter `name` equal to the folder name, a `description` that says what the skill does and when to use it, and a body short enough to read in one pass. Move long reference material to `references/` next to `SKILL.md`. Write capability words as orcstack tokens (``task``, `the `ask` tool`, and the rest in `harness/*.json`), never as one harness's tool names.
2. Validate the skill: frontmatter has `name` and `description`, referenced files exist, cross-skill links resolve.
3. Test cases if structural. Skip if subjective.
4. Run **Opening a PR**.

When in doubt, delete. Keep only prose that changes a decision. Tell it to do the thing and skip the reason. Explain only when the rule is confusing without one. Match tone to scope. Point at structural sources (types, READMEs, config) per the **encode-lessons-in-structure** principle skill. Delegate to other skills by path. Don't restate. A workflow you keep hitting but isn't captured → propose a new skill.

**Reply:** summary of the skill, key design decisions, validation notes.
