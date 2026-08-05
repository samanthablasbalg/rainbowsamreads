// The app's one "waiting" state, shared by everything that boots: the route guards
// while the session request is in flight, and each lazy route's HydrateFallback while
// its chunk is in flight. One component so a cold load reads as a single continuous
// wait rather than a sequence of different-looking ones.
//
// role="status" makes this an aria live region, so a screen reader is told the app is
// working instead of being handed a silent blank.
export function Pending() {
  return <p role="status">Loading…</p>;
}
