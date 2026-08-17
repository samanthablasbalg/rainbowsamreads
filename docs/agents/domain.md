# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the
codebase.

This is a **single-context** repo: one root `CONTEXT.md`, one ADR directory.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the glossary.
- **`docs/decisions/`** — the ADRs. **Note the path**: this repo uses `docs/decisions/`, not the
  `docs/adr/` the skills' defaults assume. Read the records that touch the area you're about to work
  in.
- **`docs/architecture.md`** — the full system picture. The ADRs hold the _why_ behind it.

If `CONTEXT.md` doesn't exist, **proceed silently**. Don't flag its absence; don't suggest creating
it upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and
`/improve-codebase-architecture`) creates it lazily when terms actually get resolved.

## Writing an ADR

`.claude/skills/domain-modeling/ADR-FORMAT.md` is the standard — template, status vocabulary,
numbering, when a decision earns a record, and the index row that has to go with it. It has been
adapted to this repo and outranks any ADR default a skill carries.

Significant decisions are recorded there rather than restated in other docs or PR summaries.

## Use the glossary's vocabulary

When your output names a domain concept (an issue title, a refactor proposal, a hypothesis, a test
name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing
language the project doesn't use (reconsider), or there's a real gap (note it for
`/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0033 (frontend layering and import direction) — but worth reopening because…_
