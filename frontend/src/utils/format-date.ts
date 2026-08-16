import type { DatePrecision } from '@/api/generated/readingTracker.schemas';

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

// An option set to `undefined` reads to Intl as not supplied, so these subtract fields
// from the defaults above rather than overriding them. Month precision takes the long
// name: with no day beside it, "Mar 2019" reads as truncated rather than imprecise.
const PRECISION_OPTIONS: Record<DatePrecision, Intl.DateTimeFormatOptions> = {
  day: {},
  month: { day: undefined, month: 'long' },
  year: { day: undefined, month: undefined },
};

// Named for the enum, not for books -- DatePrecision is shared with engagement dates.
export function formatDateAtPrecision(iso: string, precision: DatePrecision): string {
  return formatIsoDate(iso, PRECISION_OPTIONS[precision]);
}

// Both `_on` dates are UTC midnight (see above), so this is already a whole number of
// days -- no rounding needed.
export function formatDaysBetween(startIso: string, endIso: string): string {
  const days = (Date.parse(endIso) - Date.parse(startIso)) / (1000 * 60 * 60 * 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
