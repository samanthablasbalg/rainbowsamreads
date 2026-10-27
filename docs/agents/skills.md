# Agent Skills

`.agents/skills/` is the canonical project skill directory for Claude and Codex. `.claude/skills/`
contains relative links into that directory; it is not a second editable copy.

`skills-lock.json` records upstream-sourced skills. A skill without a lock entry is project-owned
and must not be replaced by an upstream installer. Repository policy belongs in project-owned
documentation or skills, so upstream folders can be updated without carrying local patches.

## Updating an upstream skill

Treat an update as a reviewed content merge:

1. Fetch the candidate into a temporary directory. Leave the tracked `.agents/skills/` copy intact.
2. Compare the entire candidate folder with the tracked folder, including metadata, references,
   templates, scripts, fixtures, and assets.
3. If the old upstream revision is known, compare old upstream, new upstream, and the tracked copy.
   If it is unknown, treat every difference as potentially local rather than assuming the tracked
   copy is pristine.
4. Apply only reviewed changes to the target folder. Updating one skill never replaces the whole
   collection.
5. Update `skills-lock.json` after the accepted content is in place.
6. Inspect the final diff and confirm the matching `.claude/skills/<name>` link still resolves to
   `.agents/skills/<name>`.

The update is complete when the diff contains only reviewed changes, repository policy still has a
project-owned source of truth, the lock entry matches the installed content, and both platforms
resolve the same canonical folder.
