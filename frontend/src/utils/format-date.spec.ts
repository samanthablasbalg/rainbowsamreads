import { DatePrecision } from '@/api/generated/readingTracker.schemas';
import { formatDateAtPrecision, formatIsoDate } from './format-date';

describe('formatIsoDate', () => {
  it('keeps the calendar day the backend wrote', () => {
    expect(formatIsoDate('2025-03-12')).toBe('Mar 12, 2025');
  });
});

describe('formatDateAtPrecision', () => {
  it('renders a day-precise date in full', () => {
    expect(formatDateAtPrecision('2019-03-08', DatePrecision.day)).toBe('Mar 8, 2019');
  });

  it('renders a month-precise date without inventing a day', () => {
    expect(formatDateAtPrecision('2019-03-01', DatePrecision.month)).toBe('March 2019');
  });

  it('renders a year-precise date as the bare year', () => {
    expect(formatDateAtPrecision('2019-01-01', DatePrecision.year)).toBe('2019');
  });
});
