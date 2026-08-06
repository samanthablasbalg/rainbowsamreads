// Per ADR-0024, business dates come from the client's local day, never the server's
// clock -- `toISOString()` converts to UTC first, which is the wrong calendar day for
// part of the evening in any timezone behind UTC. This reads the local
// year/month/day directly instead.
export function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
