# How test runs behave here

Two hooks shape every test run in this repo. Neither is optional, and neither can be argued with —
they rewrite or reject the command before it executes.

## The test-command hook

`.claude/hooks/test-command.sh` runs on `PreToolUse` for every Bash call and rewrites **any** test
command — whatever shape it was typed in — to:

```
<runner invocation> > /tmp/test.log 2>&1; echo exit=$?
```

It exists so a run can never stream to the terminal or be truncated by a pager, because a truncated
run is what leads to running the suite a second time to see what got cut off.

- **`exit=0` means the suite PASSED.** Not truncated, not silent failure, nothing missing.
- **On failure the hook prints:**
  `FAILED. The full output is in /tmp/test.log. Read that file. Do NOT re-run the suite.` Read the
  log. Do not re-run.
- **Decoration is stripped.** A trailing `| tail -40`, `2>&1`, `> somewhere.log`, or `; echo` is cut
  before the command runs, as is a leading `cd foo &&` chain (the runner is taken as the last link).
  Type the bare documented command.
- **Alternate runners are matched too.** `npx vitest`, `node node_modules/.bin/vitest`,
  `python -m pytest`, `uv run pytest` and friends all match, deliberately — reaching for a different
  entry point to escape the hook is the bypass it exists to prevent.
- The hook also **grants permission**, so a documented test command never raises a prompt.

## The Stop hook

When you finish, a `Stop` hook runs `pre-commit run --files <changed and untracked files>` against a
copy of the git index. If it fails you get its output and the stop is blocked.

Fix what it reports. It is a formatting and lint gate — **not** a reason to run the test suite
again.

## Why e2e is chromium-only

`playwright.config.ts` defines `chromium`, `firefox` and `mobile`, and a bare `npm test` runs all
three. An agent gets no actionable information from the other two, at three times the wall clock — a
full three-project run also exceeds the two-minute window a foreground Bash call gets here, and dies
half-finished. Always pass `--project=chromium`.

`--reporter=dot` is needed because the repo's default reporter is `html`.
