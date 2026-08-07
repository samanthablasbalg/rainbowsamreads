// Per ADR-0024, business dates come from the client's local day, never the server's
// clock -- `toISOString()` converts to UTC first, which is the wrong calendar day for
// part of the evening in any timezone behind UTC. This reads the local
// year/month/day directly instead.
export function localIsoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
