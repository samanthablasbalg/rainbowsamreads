// `_on` dates are date-only strings ("2025-03-12"). `new Date` reads those as UTC
// midnight, so formatting them in local time lands on the previous day for anyone behind
// UTC -- ADR-0024's problem, in the other direction. Formatting in UTC too keeps the
// calendar day the backend wrote.
// `options` is spread last so a caller can add a part -- a weekday, say -- without
// restating the defaults, and without a second copy of the timeZone pin above.
export function formatIsoDate(iso: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}
