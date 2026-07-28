# 0029. The dev stack is served on one origin by a reverse proxy

- Status: Accepted
- Date: 2026-07-28

## Context

Production is one process on one origin. The root `Dockerfile` builds Angular to static files and
copies them in; `main.py` serves the SPA from the same FastAPI app with `/api` mounted under it. A
browser talking to the deployed app sees a single host.

Development had a shape production never has: two origins stitched together by Angular's dev-server
proxy. `ng serve` on `:4200` with `proxy.conf.json` forwarding `/api` to `api:8000`, and a second
config, `proxy.e2e.conf.json`, doing the same for the e2e stack's `:4201` → `:8001`.

Two origins is not merely untidy. It leaks:

- **The Angular proxy is a dev-server feature, so it only covers traffic that goes through
  `ng serve`.** Anything else — Playwright's `ApiClient`, a `curl`, a second frontend — has to know
  the backend's own address, which is a different string.
- **That split cost a duplicated login.** `auth.setup.ts` had to `POST /auth/test-login` twice, once
  through the proxy and once direct, so the session cookie existed under both origins.
- **`baseURL` was a different string in every environment**, which is exactly the kind of per-
  environment branch that makes a CI-only failure hard to reproduce.

## Decision

**A Caddy service publishes the whole dev stack on one port. `/api/*` goes to `api:8000`, everything
else to `frontend:4200`.**

1. **One published port**, `PROXY_PORT` (default `8080`), and the app lives there.
   `docker/caddy/Caddyfile` is the entire routing config — two `handle` blocks.

2. **The frontend handle rewrites `Host` to `frontend:4200`; the `/api` handle does not.** Each half
   needs the opposite thing, and this is the only subtle part of the file:

   - Angular's dev server checks the incoming `Host` against `allowedHosts`, now `["frontend"]` in
     `angular.json`. Pinning the header in the proxy means that list never has to change again — not
     for a new published port, not for a different compose project name in CI.
   - The backend derives its OAuth redirect URI from the request's `Host`
     (`request.url_for("callback")`), so it has to see the address the browser actually used. Caddy
     preserves the incoming `Host` by default, which is what the `/api` handle wants; only the
     frontend handle overrides it.

3. **Both Angular proxy configs are deleted.** `angular.json`'s `serve` options carry `allowedHosts`
   where they used to carry `proxyConfig`.

4. **`_frontend_url()`'s local default moves from `:4200` to `:8080`**, so the post-login redirect
   lands on the single origin.

## Consequences

**Makes easy:**

- **One origin string, everywhere.** The same URL works for a browser, for Playwright's `baseURL`,
  and for a direct API call — and it is the shape production already has.
- **The double `test-login` collapses to one call.** There is only one origin for the cookie to land
  under, so [[0030-e2e-runs-against-the-compose-dev-stack]] gets that deletion for free.
- **The dev stack now has production's shape without production's build.** That is what makes "run
  the production image as the local authoring target" a cheap experiment later rather than a rewrite
  — the addressing is already right.

**What we accept:**

- **The Google OAuth client must have `http://localhost:8080/api/auth/callback` registered.** The
  old `:4200` URI no longer matches what the backend derives. An unregistered URI fails with
  `Error 400: invalid_request` before the sign-in prompt, and the e2e suite will not catch it,
  because the suite logs in through the `test-login` bypass rather than Google.
- **`:4200` still answers, and its `/api` is dead.** There is no dev-server proxy any more, so
  hitting the frontend directly gets an app that cannot reach its backend. It presents as a backend
  outage rather than as a wrong address.
- **One more container in the standing stack**, and it sits between you and every request, so a
  routing mistake looks like an app bug.
- **Two files know the hostname Angular expects** — the `Caddyfile` and `angular.json` — and they
  have to agree. Each says so at the point of use.

## Alternatives considered

- **Widen Angular's `allowedHosts` instead of pinning `Host` in the proxy.** Rejected because the
  list would then have to enumerate every name the proxy could be reached by, and grow again for
  each new one. Pinning it in one place makes the Angular side permanently indifferent.
- **Keep the dev-server proxy and point everything at `:4200`.** Rejected: it covers only traffic
  through `ng serve`, so the two-origin problem and the duplicated login both survive.
- **nginx.** Same job. Caddy's config for this is four meaningful lines with no boilerplate, and the
  image is small.
- **Serve the production image locally instead.** Genuinely collapses dev onto production's artifact
  and is not ruled out — but it trades HMR for a full Angular production build on every frontend
  edit. Parked; this record is not wasted work if it is picked up.

## Revisit when

- **The production image becomes the local authoring target.** The proxy stops being needed for the
  frontend half — that image already serves both from one origin — though it may stay as the stable
  address in front of it.
- **A second app service appears.** The `Caddyfile` is where routing decisions land, and two
  `handle` blocks is the current whole story.
