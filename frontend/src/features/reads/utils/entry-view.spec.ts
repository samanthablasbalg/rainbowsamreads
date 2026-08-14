import { buildMinuteLog, buildPageLog } from '@/test/data-generators';
import { toEntryViews } from './entry-view';

describe('toEntryViews', () => {
  it('labels a page log with its range and the pages it covered', () => {
    const [entry] = toEntryViews([buildPageLog({ page_start: 50, page_end: 100 })]);

    expect(entry.rangeLabel).toBe('pp. 50–100');
    expect(entry.amountLabel).toBe('+50 pp');
  });

  it('labels a minute log as clock positions and the minutes it covered', () => {
    const [entry] = toEntryViews([buildMinuteLog({ minute_start: 80, minute_end: 125 })]);

    expect(entry.rangeLabel).toBe('01:20–02:05');
    expect(entry.amountLabel).toBe('+45 min');
  });

  it('labels the date with its weekday, on the calendar day the API sent', () => {
    const [entry] = toEntryViews([buildPageLog({ logged_on: '2025-06-15' })]);

    expect(entry.dateLabel).toBe('Sun, Jun 15, 2025');
  });

  it('returns entries newest first, reversing the ascending order the API sends', () => {
    const entries = toEntryViews([
      buildPageLog({ id: 'older', logged_on: '2025-06-14' }),
      buildPageLog({ id: 'newer', logged_on: '2025-06-15' }),
    ]);

    expect(entries.map((entry) => entry.id)).toEqual(['newer', 'older']);
  });

  it('marks only the last of the read as newest, whatever order it renders in', () => {
    const entries = toEntryViews([
      buildPageLog({ id: 'older', logged_on: '2025-06-14' }),
      buildPageLog({ id: 'newer', logged_on: '2025-06-15' }),
    ]);

    expect(entries.find((entry) => entry.id === 'newer')?.isNewest).toBe(true);
    expect(entries.find((entry) => entry.id === 'older')?.isNewest).toBe(false);
  });

  it('returns nothing for a read with no logs', () => {
    expect(toEntryViews([])).toEqual([]);
  });
});
