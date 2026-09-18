# A correct testing instinct can target the wrong seam

A test needs a discriminating signal: if the code supplies the wrong input, the test must be able to
fail. That instinct remains correct even when its first implementation assigns the behavior to the
wrong layer. The correction is to preserve the discrimination while moving the assertion to the seam
that owns the behavior.

## Historical context

This insight surfaced while adding the frontend TBR shelf for issue #77, against the code based on
[`90eda7b`](https://github.com/samanthablasbalg/rainbowsamreads/commit/90eda7b495a04c66c05d5e94ea169590cc2b979b).
The shared engagement shelf already accepted a reading status, requested engagements with that
status, and rendered whatever the API returned. The missing behavior was route composition:
`/library/tbr` still rendered a placeholder instead of configuring the shared shelf with `tbr`.

The user's first instinct was that a route test needed more than a heading assertion. A static mock
would return the same data even if the route requested the wrong status, so such a test could not
prove that each route selected its own shelf. To make the test sensitive, the user created three
engagements with different statuses and expected each route to show only its matching engagement.

That was the right demand for a discriminating test, applied at the wrong seam. Filtering the three
engagements is the backend endpoint's responsibility. The frontend sends one status and renders the
already-filtered response; it must not receive an unfiltered collection and reproduce the backend's
filtering. Consequently, a mock that returned all three engagements caused the Finished and DNF
cases to render all three, not because the frontend was broken, but because the mock had supplied a
response the real endpoint would not produce.

## The corrected test shape

The router's observable responsibilities are:

1. request the status belonging to the selected route; and
2. render the row returned for that request.

The MSW handler therefore does not implement backend filtering. It records the actual `status` query
parameter and returns one minimal engagement fixture for the current case. The test separately
asserts that the recorded status matches the route's expected status and that the returned row is
visible.

```text
route under test
    -> frontend requests one status       # router/shelf behavior observed here
    -> mock records that status
    -> mock returns one prepared row       # no backend algorithm recreated
    -> frontend renders the row
```

The shared shelf's own spec establishes that a supplied status is forwarded and returned rows are
rendered. The router spec establishes the other side of the composition: each URL supplies the
correct status to that shared behavior. These are adjacent contracts, not a request to duplicate the
backend's filtering implementation.

## Evidence

After seeing the over-broad mock make the existing Finished and DNF cases fail, the user identified
the distinction directly: the original instinct to make the test sensitive to the selected status
was correct, but building a three-book collection and expecting frontend filtering tested at the
wrong level. The test still needed _something_ that would fail for an incorrect route-to-status
mapping; capturing the outbound query supplied that signal at the frontend's actual seam.

## Implications

- Preserve the instinct that a mock must let the test distinguish correct input from incorrect
  input; a mock that returns the same useful result for either can create a false positive.
- Before making a mock more realistic, ask which system owns the behavior being simulated. Do not
  recreate a backend transformation in a frontend test.
- At an HTTP seam, use the request as evidence for frontend-owned behavior and keep the response to
  the minimum needed to observe rendering.
- When neighboring tests appear repetitive, identify the separate contract each one proves: a
  reusable module can verify how it handles an input while a composition test verifies that its
  caller supplies the right input.
