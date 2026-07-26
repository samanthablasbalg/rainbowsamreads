# 0028. Development happens in a container

- Status: Accepted
- Date: 2026-07-26

## Context

[[0027-database-provisioning-by-lifetime]] moved the database into a container and made every
environment set it up by one mechanism. This record finishes that move: everything else. Before it,
the dev stack ran natively — Postgres from Homebrew, a venv at `backend/venv`, `node_modules` from
whatever npm the Mac had, uvicorn and `ng serve` started by hand in two terminals.

Two pressures forced it.

**A clean machine could not contribute.** Four pre-commit hooks are `language: system` — they shell
out to the project's own ruff, mypy and npx rather than to copies pre-commit builds itself. So
Python and Node had to be installed on the host, at the right versions, before a commit could pass
its checks. "Clone and start working" was not true, and the failure was quiet: a missing tool makes
a hook error, not a lint failure, and it is easy to skip past.

**Three toolchains gave three answers.** CI installed its own Python and Node through
`setup-python`/`setup-node`; local development used Homebrew's; the production `Dockerfile` had a
third. Nothing pinned them to each other. A green CI run meant "this works with the versions the
runner happened to resolve" — not "this works with the versions you develop against", which is the
claim you actually want from it.

Most of the awkward parts below trace back to the host being a Mac. Docker Desktop's bind mounts
cross a VM boundary, so file access is dramatically slower than native. Git worktrees store absolute
paths. SSH keys live in 1Password's agent rather than on disk, and Claude's credentials live in the
Keychain — neither readable from a Linux container.

## Decision

**Development happens inside the containers defined by `compose.yaml`. The Mac holds Docker, an
editor, and nothing else this project needs.**

1. **The dev image is the inverse of the production image.** The root `Dockerfile` copies source in
   and builds it, freezing the code at build time — correct for a deployable artifact, useless for
   editing. `Dockerfile.dev` installs toolchains and no source at all; the repo arrives at run time
   as a bind mount, so an edit on the host is live in the container with no rebuild.

   It carries both toolchains in one image — Python from the base, Node copied out of `node:24-slim`
   — rather than a Python image for the API and a Node image for the frontend. The services differ
   only in `working_dir` and `command`. One image means one thing to rebuild, and the pre-commit run
   needs both toolchains present in the same place anyway.

2. **The repo is mounted at its own absolute host path** (`.:${PWD}`), not the conventional
   `/workspaces/<name>`. A git worktree's `.git` is a file holding an absolute path into the main
   repo's `.git/worktrees/`, and `.git/worktrees/<name>/gitdir` holds an absolute path back. One
   copy of each, shared by both sides through the bind mount, holding one value where two different
   mount roots would need two. Whichever side creates the worktree writes its own path and strands
   the other. `git worktree repair` cannot arbitrate — it has one value to write too, so it fixes
   the side that ran it and breaks the other. Identical paths make the stored value correct
   everywhere, and which side created a worktree stops mattering.

   Because worktrees live at `.claude/worktrees/` _inside_ the repo, the single mount of the repo
   root already covers both the worktree and the `.git/worktrees/` metadata it points at. No second
   mount is needed.

3. **The two dependency stores are handled oppositely, and neither is installed by
   `postCreateCommand`.** They pull in opposite directions and get opposite answers:
   - **Python deps are baked into the image at `/opt/venv`,** outside the repo. A venv inside the
     repo sits under the bind mount, which would make it slow, which would mean a named volume,
     which start empty — so `uvicorn` would not exist on a first `docker compose up` and the `api`
     service would crash-loop until something installed it. Outside the repo, it is simply there.
     `/opt/venv/bin` goes first on `PATH`, which is what removes the activation step.
   - **`node_modules` lives in a named volume,** installed on first boot by the `frontend` service's
     command. Tens of thousands of small files read through a macOS bind mount is the difference
     between a fast rebuild and an unusable one; a named volume lives inside Docker's VM and does
     not cross the boundary. The install is guarded on a marker file, so it happens once.

   Both are reachable by `docker compose up` alone. `postCreateCommand` would have worked for either
   and is the devcontainer-conventional home, but it only fires for someone opening VS Code — which
   would make a plain `docker compose up` a second-class path that quietly produces a broken stack.

4. **A `workspace` service that runs nothing.** It is the VS Code attach target and where
   `docker compose exec` lands for tests, git, pre-commit and Claude. It exists separately from
   `api` because VS Code replaces an attached service's command with `sleep infinity` by default;
   attaching to `api` would therefore kill uvicorn. (`overrideCommand: false` is set anyway, so that
   `pre-commit install` in the workspace command keeps running — but the separation is what makes
   the choice safe either way.)

   It is also the only service carrying personal `$HOME` mounts. That is why CI runs its checks
   against `api` instead: none of those host paths exist on a runner, and a bind mount pointing at a
   missing path silently creates an empty directory rather than failing.

5. **CI runs the same `compose.yaml` against the same image.** No `setup-python`, no `setup-node`,
   no runner-side installs, no separate Postgres service block. Both workflows build the dev image
   and run every check through `docker compose run`. This is the point of the whole exercise: a
   green run now means the toolchain you develop with agreed, not a coincidentally similar one.

   The cost is honest — CI trades a warm dependency cache for an image build. What it buys is that
   the three-way divergence in **Context** cannot reappear, because there is no longer a second
   place to declare a version.

6. **Pre-commit hooks stay `language: system`.** The usual reason to let pre-commit manage hook
   environments is that it cannot assume the tool is installed. In the container it can. Managed
   environments would mean a second pinned version of ruff and mypy to keep in step with
   `backend/requirements.txt` by hand — the exact divergence this record exists to remove, in
   miniature. `mypy`'s `additional_dependencies` list goes away for the same reason: the image's
   venv already has sqlalchemy and fastapi in it.

   `pre-commit install` runs in the `workspace` service's command rather than being left to the
   reader. Git never clones `.git/hooks/`, so a fresh clone commits with no checks at all and says
   nothing about it (#164).

7. **Claude Code runs inside the container, and credentials are forwarded rather than copied.**
   `scripts/claude` starts the `workspace` service and execs into it. It has to be inside: the
   permission rules in `.claude/settings.json` match bare commands (`python -m pytest`), and the
   Stop hook resolves `pre-commit` from `PATH` — wrapping either in `docker compose exec` from the
   host defeats both. Claude's config, skills and memory are bind-mounted from the Mac, so history
   carries across; the memory directory is keyed by project path, which decision 2 leaves unchanged.

   Secrets do not come with them. Claude's and `gh`'s credentials sit in the macOS Keychain, so each
   needs one login inside the container, after which both persist through the mount. SSH keys live
   in 1Password and never touch disk at all — only its **agent socket** is mounted, so `git push`
   from inside uses the same key with the same approval prompt on the Mac, and no key material is
   ever copied into a container.

8. **`SESSION_SECRET` is a known literal in `compose.yaml`, not a repository secret.** Local and CI
   sessions live in a database that gets thrown away, so there is nothing to protect; production
   still refuses to boot without a real one. Beyond tidiness this fixes a live break — GitHub
   withholds repository secrets from Dependabot-triggered runs, so `secrets.SESSION_SECRET` resolved
   to an empty string and every job that imports the app died on the start-up check.

## Consequences

**Makes easy:**

- **A clean Mac can contribute with Docker and nothing else.** No Python, no Node, no Postgres, no
  version to match. `docker compose up` is the whole setup, and pre-commit hooks install themselves.
- **One place declares a version.** Python and Node in `Dockerfile.dev`, Python libraries in
  `backend/requirements.txt`, and nothing anywhere else — no workflow file, no host, no second
  pre-commit pin. Bumping one is editing one line.
- **CI failures are reproducible by construction.** The command that failed on the runner is the
  same command in the same image locally.
- **Worktrees keep working from both sides**, unmodified, and a worktree can run its own full stack
  — compose reads its ports from environment variables, and `.worktreeinclude` already copies the
  `.env` files into each one.
- Editor, terminal, debugger and language servers all sit inside the container while the VS Code UI
  stays native.

**What we accept:**

- **Identical-path mounting is unusual and will look wrong to anyone who knows devcontainers.** It
  is load-bearing for worktrees and nothing else, and `/workspaces/<name>` cannot be swapped back in
  without breaking them. Both `compose.yaml` and `devcontainer.json` say so at the point of use.
- **Interactive work has a `docker compose exec` in front of it.** `scripts/claude` hides it for the
  one case that runs constantly; everything else is typed.
- **CI got slower.** An image build replaces a warm pip/npm cache, on every run.
- **Bind-mount performance on macOS is a permanent tax**, and the mitigations are per-directory. The
  `node_modules` volume handles the one directory big enough to matter today; a future one would
  need the same treatment, and the symptom is slowness rather than an error.
- **The interpreter path could not simply be repointed; it had to be deleted.** Workspace settings
  outrank the devcontainer's, so any `python.defaultInterpreterPath` in `.vscode/settings.json`
  would win _inside_ the container too — the Mac's venv path cannot coexist with the container's, it
  silently beats it. `.devcontainer/devcontainer.json` is now the only file that sets one, which is
  right but leaves VS Code opened on the Mac with no interpreter configured, and leaves the
  precedence rule that forces this recorded only in a comment.
- **The container runs as root.** Devcontainer convention is a non-root user; Docker Desktop remaps
  bind-mount ownership on macOS anyway, so it buys nothing here and costs a uid-matching problem.
  This assumption is macOS-shaped and does not survive a move to a Linux host.
- **First-run cost moved rather than disappeared** — an image build and an `npm ci` into an empty
  volume, instead of installing three toolchains by hand. Better, but not free, and it recurs
  whenever the volume is dropped.

## Alternatives considered

- **Devcontainer only, no compose services.** A single container to develop in, with the app still
  started by hand inside it. Simpler, and it solves the clean-machine problem. Rejected because it
  leaves "start the stack" as a manual multi-terminal ritual and gives CI nothing to reuse — the
  convergence in decision 5 falls out of _services_, not out of _a container_.
- **Separate Python and Node images per service.** Conventional, and smaller images. Rejected
  because pre-commit needs both toolchains in one place, so a combined image would have had to exist
  anyway as a third thing to maintain.
- **`/workspaces/<name>` with `git worktree repair`.** The documented devcontainer path. Rejected
  because `repair` has one path to write and two roots to satisfy: it fixes whichever side ran it
  and breaks the other. Where the worktree gets created does not change this — one made inside the
  container is as broken on the host as the reverse. Identical paths remove the conflict rather than
  alternating it.
- **Keeping CI on `setup-python`/`setup-node`** and containerizing only local development. Keeps CI
  fast and is much the smaller change. Rejected because it preserves exactly the split that made a
  green run mean less than it looked like — the divergence, not the setup cost, is the problem being
  solved.
- **Letting pre-commit manage its own hook environments**, which would make the hooks work on a host
  with no toolchain. Rejected as solving the problem in the wrong direction: it makes the host a
  supported place to work again, at the price of a second set of tool versions to keep in step.
- **Mounting `~/.ssh` wholesale** rather than forwarding the 1Password agent socket. Rejected
  because that directory's `config` sets `IdentityAgent` to a macOS path that does not exist in the
  container and would override `SSH_AUTH_SOCK`. Only `known_hosts` is mounted, to skip the host-key
  prompt.

## Revisit when

- **CI build time starts hurting.** The fix is registry layer caching for the dev image, not going
  back to runner-side installs.
- **A second person works on this.** The `workspace` service's mounts assume one specific `$HOME`
  layout, and `.devcontainer/devcontainer.json` hardcodes a 1Password socket path.
- **e2e moves into containers (#181).** It is the one remaining stack that installs Python on the
  runner and starts a bare uvicorn through Playwright's `webServer`, which is why it still sets
  `SESSION_SECRET` itself and still calls `app.provision` by hand.
- **Anything needs to run on the host again** — a tool that cannot see the container's filesystem,
  or a profiler that needs native performance. The current arrangement assumes the host is empty,
  and the `language: system` hooks in decision 6 are the first thing that breaks if that stops being
  true.
