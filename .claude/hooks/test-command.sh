#!/bin/sh
# PreToolUse/Bash: force every test-suite run into one logged form, and grant
# permission from here so no variant can ever raise a permission prompt.
#
# Whatever shape the agent typed - bare, piped to `tail`, redirected somewhere
# else, prefixed with `cd` - is rewritten to:
#
#     <runner invocation> > /tmp/test.log 2>&1; echo exit=$?
#
# The point is unchanged from the hook this replaces: a test run must never
# stream to the terminal or get truncated by a pager, because a truncated run
# is what leads to running the suite again to see what got cut off. The exit
# code is the whole answer on a pass; /tmp/test.log is there for a failure.
#
# Rewriting rather than rejecting is deliberate. A rejection costs a round trip
# and the agent just retries; a rewrite cannot be argued with.
#
# POSIX `case`, never `[[ ]]`: hook commands run under /bin/sh, which is dash
# here. dash has no `[[`, so a bash-syntax test errors, the condition reads as
# false, and the hook silently exits 0 - doing nothing, forever.

LOG=/tmp/test.log

cmd=$(jq -r '.tool_input.command // ""')
[ -n "$cmd" ] || exit 0

# Cut at the first `;` or `|` that is not inside quotes. That discards the
# `; echo exit=$?` and `| tail -40` tails an agent appends, without mangling a
# quoted argument such as  pytest -k "foo | bar".
core=$(printf '%s' "$cmd" | awk '
{
  sq = 0; dq = 0
  for (i = 1; i <= length($0); i++) {
    c = substr($0, i, 1)
    if (c == "\"" && !sq)      dq = !dq
    else if (c == "\047" && !dq) sq = !sq
    else if ((c == ";" || c == "|") && !sq && !dq) break
  }
  print substr($0, 1, i - 1)
}')

# Peel off trailing redirections one at a time: `2>&1`, `> /tmp/x.log`, `&>f`.
while :; do
  stripped=$(printf '%s' "$core" | sed -E 's/[[:space:]]+([0-9]*>&[0-9-]+|&?[0-9]*>>?[[:space:]]*[^[:space:]]+)[[:space:]]*$//')
  [ "$stripped" = "$core" ] && break
  core=$stripped
done
core=$(printf '%s' "$core" | sed -E 's/[[:space:]]+$//')

# The runner is the last link of any `cd foo && ...` chain.
last=$(printf '%s' "${core##*&&}" | sed -E 's/^[[:space:]]+//')

case "$last" in
  npm\ test|npm\ test\ *|npm\ run\ test|npm\ run\ test\ *) ;;
  # `check` is lint && typecheck && test; the redirect wraps the whole chain,
  # so all three stages land in the log rather than only the test output.
  npm\ run\ check|npm\ run\ check\ *) ;;
  npx\ vitest|npx\ vitest\ *|vitest|vitest\ *) ;;
  # Direct entrypoints to the same runners. Without these, `node
  # node_modules/vitest/vitest.mjs run` walks straight past the case list and
  # streams to the terminal -- the exact bypass this hook exists to prevent.
  *node_modules/*vitest*|*node_modules/.bin/*|node\ *vitest*|node\ *jest*) ;;
  pytest|pytest\ *) ;;
  python\ -m\ pytest|python\ -m\ pytest\ *) ;;
  python3\ -m\ pytest|python3\ -m\ pytest\ *) ;;
  uv\ run\ pytest|uv\ run\ pytest\ *) ;;
  ng\ test|ng\ test\ *|npx\ ng\ test|npx\ ng\ test\ *) ;;
  *) exit 0 ;;
esac

new="$core > $LOG 2>&1; c=\$?; echo exit=\$c; [ \$c -eq 0 ] || echo \"FAILED. The full output is in $LOG. Read that file. Do NOT re-run the suite.\""

jq -cn --arg c "$new" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    permissionDecisionReason: "Test run captured to /tmp/test.log. Read it only if the exit code is non-zero.",
    updatedInput: { command: $c }
  }
}'
