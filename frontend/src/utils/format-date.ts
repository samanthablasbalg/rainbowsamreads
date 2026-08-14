// `_on` dates are date-only strings ("2025-03-12"), which `new Date` reads as UTC
// midnight. Formatting in UTC keeps the calendar day the backend wrote.
export function formatIsoDate(iso: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Date(iso).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}
