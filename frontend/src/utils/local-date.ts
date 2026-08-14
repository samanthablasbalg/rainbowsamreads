// ADR-0024: business dates are the client's local day, never the server's clock, and
// never `toISOString()` -- both land an evening behind UTC on tomorrow's date.
export function localIsoDate(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
