# Query state reveals the failing boundary

Against frontend baseline commit `96451a54`, the learner traced a query-backed component's
apparently blank output through TanStack Query's lifecycle: `isPending` explains `null` while the
request is in flight, `isError` explains `null` after the attempts fail, and successful `data` is
the state that makes `data.count` available. They then used the browser's three HTTP 500 responses
and the backend traceback to distinguish “React failed to issue the request” from “the request
reached the server, which failed while handling it.”

## Evidence

The learner independently located the app's `QueryClient` in `frontend/src/app/provider.tsx`,
connected its retry policy to the repeated requests, and correctly concluded that React had made the
request and the failing boundary was server-side. The observed traceback ended in a Python
argument-binding `TypeError` at the call from the streak API route into `calculate_streak`.

## Implications

Future query debugging can begin with the result object's state and the browser Network panel rather
than changing JSX speculatively. A successful HTTP request is not required to prove that the hook
and request wiring ran; an HTTP response, including a 500, already establishes that the request
crossed the frontend/backend boundary.
