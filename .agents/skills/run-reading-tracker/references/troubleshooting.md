# Troubleshooting

Symptom → fix. Every entry is an error hit while building this skill, not a generic list.

- **`Cannot read properties of undefined (reading 'launch')`**: the endpoint has no `?browser=`
  query. `playwright run-server` has no default browser type, so it resolves an undefined browser
  and calls `.launch()` on it. Use `--endpoint "ws://browsers:5000/?browser=chromium"`.
- **`no target specified for attach command`**: a config file alone is not a target. Pass
  `--endpoint` as well — the config supplies options, not the thing to attach to.
- **`RangeError: Incorrect locale information provided`** in the console: the container's locale
  reaches the page as `navigator.language === "en-US@posix"`, which is not valid BCP-47, so
  `new Intl.Locale()` throws while a dependency is still evaluating — it takes the TanStack devtools
  down with it. `e2e/.playwright/cli.config.json` fixes it by setting `contextOptions.locale`.
  Seeing this error means the config was not picked up: you are running from the wrong directory.
  Run from `e2e/`.
- **`401 (Unauthorized)` on `/api/auth/me`**: you have not logged in yet in this session. Run the
  `test-login` eval from SKILL.md.
- **The page renders but shows no books**: the database was truncated (an e2e run does this before
  every test) or you logged in before seeding. Reseed, then log in again — in that order.
- **`No matches found` for something you can see on the page**: the app was still rendering
  `Loading…` when `find` ran. Run it again. Never add a sleep.
- **`goto` cannot reach `proxy:8080` at all**: a service is down, or the whole stack is. You cannot
  fix this — there is no docker CLI and no docker socket in here, and `docker compose up` is run
  from the Mac. Say exactly what failed and stop. Do not retry, do not reach for another tool, and
  do not install anything.
