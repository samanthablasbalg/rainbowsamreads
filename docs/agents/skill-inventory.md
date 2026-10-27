# Skill inventory

This is the preservation baseline for the agent-skill reorganization begun in issue #266. It records
the complete tracked collection before any skill is moved or updated. All folders include
`SKILL.md`; the supporting-content column lists every other tracked file in that folder.

## Snapshot

The baseline is commit `e19bc1023488d0dbab34f92796a6df9e68a7a7fb`:

| Path               |     Skills | Files | Git object                                      |
| ------------------ | ---------: | ----: | ----------------------------------------------- |
| `.claude/skills`   |         30 |    94 | tree `835cc916cbde1c8580304d695bf094208da6d8e8` |
| `.codex/skills`    |          2 |     5 | tree `58fad2367698be728991719c3bfa85fba83d669b` |
| `skills-lock.json` | 26 entries |     1 | blob `416ee57bd5d22fe0014ad973ed06fa77b0d211d0` |
| `.agents/skills`   |          0 |     0 | no tracked content                              |

The two skill trees contain 32 skills and 99 files. Empty directories seen in a working copy are not
part of the Git snapshot and must not be treated as installed skills. Preserve the baseline by
moving tracked folders with history intact and comparing the resulting content with these tree
objects before accepting an upstream update.

`skills-lock.json` records source repositories, skill paths, and computed folder hashes for 25
skills from `mattpocock/skills` and one from `shadcn/ui`. It does not record an upstream revision or
retain an editable upstream copy, so it is provenance rather than a three-way-merge baseline.

## Upstream-sourced skills

`Unchanged since import` means the repository has no content change relative to the copy added in
commit `35a7acfe`; it does not prove which upstream revision supplied that copy. The Matt Pocock
revision `9c9f36ccd3995266cd675468af71639c8dde1ec5` is only a comparison candidate from the import
date, not an established baseline.

| Skill                           | Source              | Repository status           | Supporting content                                                                                                                                                                                                             |
| ------------------------------- | ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ask-matt`                      | `mattpocock/skills` | Unchanged since import      | `PHASE-BOUNDARIES.md`, `agents/openai.yaml`                                                                                                                                                                                    |
| `code-review`                   | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `codebase-design`               | `mattpocock/skills` | Unchanged since import      | `DEEPENING.md`, `DESIGN-IT-TWICE.md`, `agents/openai.yaml`                                                                                                                                                                     |
| `diagnosing-bugs`               | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`, `scripts/hitl-loop.template.sh`                                                                                                                                                                          |
| `domain-modeling`               | `mattpocock/skills` | Locally adapted             | `ADR-FORMAT.md`, `CONTEXT-FORMAT.md`, `agents/openai.yaml`                                                                                                                                                                     |
| `grill-me`                      | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `grill-with-docs`               | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `grilling`                      | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `handoff`                       | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `implement`                     | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `improve-codebase-architecture` | `mattpocock/skills` | Unchanged since import      | `HTML-REPORT.md`, `agents/openai.yaml`                                                                                                                                                                                         |
| `prototype`                     | `mattpocock/skills` | Unchanged since import      | `LOGIC.md`, `UI.md`, `agents/openai.yaml`                                                                                                                                                                                      |
| `research`                      | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `resolving-merge-conflicts`     | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `setup-matt-pocock-skills`      | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`, `domain.md`, `issue-tracker-github.md`, `issue-tracker-gitlab.md`, `issue-tracker-local.md`, `triage-labels.md`                                                                                          |
| `shadcn`                        | `shadcn/ui`         | Unchanged since lock import | `agents/openai.yml`, `assets/shadcn-small.png`, `assets/shadcn.png`, `cli.md`, `customization.md`, `evals/evals.json`, `mcp.md`, `registry.md`, `rules/composition.md`, `rules/forms.md`, `rules/icons.md`, `rules/styling.md` |
| `tdd`                           | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`, `mocking.md`, `tests.md`                                                                                                                                                                                 |
| `teach`                         | `mattpocock/skills` | Unchanged since import      | `GLOSSARY-FORMAT.md`, `LEARNING-RECORD-FORMAT.md`, `MISSION-FORMAT.md`, `RESOURCES-FORMAT.md`, `agents/openai.yaml`                                                                                                            |
| `to-questionnaire`              | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `to-spec`                       | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `to-tickets`                    | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `triage`                        | `mattpocock/skills` | Unchanged since import      | `AGENT-BRIEF.md`, `OUT-OF-SCOPE.md`, `agents/openai.yaml`                                                                                                                                                                      |
| `wait-what`                     | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `wayfinder`                     | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`                                                                                                                                                                                                           |
| `wizard`                        | `mattpocock/skills` | Unchanged since import      | `agents/openai.yaml`, `template.sh`                                                                                                                                                                                            |
| `writing-for-agents`            | `mattpocock/skills` | Unchanged since import      | `SKILL-MECHANICS.md`, `agents/openai.yaml`                                                                                                                                                                                     |

### Known local adaptation

`domain-modeling/ADR-FORMAT.md` was changed in commit `13b11612` after the upstream collection was
installed. The adaptation makes `docs/decisions` the ADR directory, uses this repository's status
vocabulary and numbering, and requires the existing decision-log and README index updates. Preserve
that policy when comparing or updating the upstream skill.

Issue #266 moved the adapted standard to the project-owned `docs/agents/adr-format.md`, reached
through `docs/agents/domain.md`. The installed `domain-modeling` skill can therefore follow upstream
without carrying a local patch; upstream updates must preserve the project-owned standard and its
pointer instead.

No other upstream-sourced skill has a recorded repository edit after commit `35a7acfe`. Because the
initial import is not a proven pristine upstream baseline, classify those skills as unmodified in
this repository, not as conclusively pristine upstream copies.

## Project-owned skills

These six skills have no entry in `skills-lock.json`; the repository owns their complete contents.
An upstream installer must never replace them.

| Skill                 | Current path                         | Supporting content                                                                  |
| --------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| `make-ticket`         | `.claude/skills/make-ticket`         | None                                                                                |
| `playwright-new-test` | `.claude/skills/playwright-new-test` | None                                                                                |
| `run-reading-tracker` | `.claude/skills/run-reading-tracker` | `references/storybook.md`, `references/testing.md`, `references/troubleshooting.md` |
| `worktree`            | `.claude/skills/worktree`            | None                                                                                |
| `teach-tdd`           | `.codex/skills/teach-tdd`            | `agents/openai.yaml`                                                                |
| `write-backend-tests` | `.codex/skills/write-backend-tests`  | `references/migration-tests.md`, `references/splitting-test-files.md`               |

## Ownership rule for later changes

- **Unmodified upstream:** compare and accept upstream changes deliberately.
- **Locally adapted upstream:** retain the installed version and reconcile it against old and new
  upstream content when a baseline can be established.
- **Project-owned:** edit only as repository-owned work; keep it outside upstream replacement
  ownership.

Every relocation or update must include the whole skill folder—metadata, references, templates,
scripts, evaluation fixtures, and assets—not only `SKILL.md`.
