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

const PRECISION_OPTIONS: Record<DatePrecision, Intl.DateTimeFormatOptions> = {
  day: {},
  month: { day: undefined, month: 'long' },
  year: { day: undefined, month: undefined },
};

export function formatDateAtPrecision(iso: string, precision: DatePrecision): string {
  return formatIsoDate(iso, PRECISION_OPTIONS[precision]);
}

export function formatDaysBetween(startIso: string, endIso: string): string {
  const days = (Date.parse(endIso) - Date.parse(startIso)) / (1000 * 60 * 60 * 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
