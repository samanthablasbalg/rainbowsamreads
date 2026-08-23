import {
  buildAudioEngagement,
  buildEngagement,
  buildMinuteLog,
  buildPageLog,
} from '@/test/data-generators';
import { toDayGroups, toEntryViews } from './entry-view';

const print = buildEngagement({ length_pages: 200 });
const audio = buildAudioEngagement({ length_minutes: 250 });

describe('toEntryViews', () => {
  it('labels a page log with the pages it covered', () => {
    const [entry] = toEntryViews([buildPageLog({ page_start: 50, page_end: 100 })], print);

    expect(entry.amountLabel).toBe('+50 pp');
  });

  it('labels the ends of a page log separately, for the timeline card', () => {
    const [entry] = toEntryViews([buildPageLog({ page_start: 50, page_end: 100 })], print);

    expect(entry.fromLabel).toBe('p. 50');
    expect(entry.toLabel).toBe('p. 100');
  });

  it('labels a minute log as clock positions and the minutes it covered', () => {
    const [entry] = toEntryViews([buildMinuteLog({ minute_start: 80, minute_end: 125 })], audio);

    expect(entry.amountLabel).toBe('+45 min');
    expect(entry.fromLabel).toBe('01:20');
    expect(entry.toLabel).toBe('02:05');
  });

  it('labels the date with its weekday, on the calendar day the API sent', () => {
    const [entry] = toEntryViews([buildPageLog({ logged_on: '2025-06-15' })], print);

    expect(entry.dateLabel).toBe('Sun, Jun 15, 2025');
  });

  it('splits the date into the day and weekday the timeline header shows', () => {
    const [entry] = toEntryViews([buildPageLog({ logged_on: '2025-06-15' })], print);

    expect(entry.dayLabel).toBe('Jun 15');
    expect(entry.weekdayLabel).toBe('Sun');
  });

  it('places the session in the book as a percentage of its length', () => {
    const [entry] = toEntryViews([buildPageLog({ page_start: 50, page_end: 100 })], print);

    expect(entry.startPct).toBe(25);
    expect(entry.endPct).toBe(50);
  });

  it('measures an audio session against the audio length, not the page count', () => {
    const [entry] = toEntryViews([buildMinuteLog({ minute_start: 25, minute_end: 125 })], audio);

    expect(entry.startPct).toBe(10);
    expect(entry.endPct).toBe(50);
  });

  it('caps a session that runs past the recorded length', () => {
    const [entry] = toEntryViews([buildPageLog({ page_start: 190, page_end: 260 })], print);

    expect(entry.endPct).toBe(100);
  });

  it('returns entries newest first, reversing the ascending order the API sends', () => {
    const entries = toEntryViews(
      [
        buildPageLog({ id: 'older', logged_on: '2025-06-14' }),
        buildPageLog({ id: 'newer', logged_on: '2025-06-15' }),
      ],
      print
    );

    expect(entries.map((entry) => entry.id)).toEqual(['newer', 'older']);
  });

  it('marks only the last of the read as newest, whatever order it renders in', () => {
    const entries = toEntryViews(
      [
        buildPageLog({ id: 'older', logged_on: '2025-06-14' }),
        buildPageLog({ id: 'newer', logged_on: '2025-06-15' }),
      ],
      print
    );

    expect(entries.find((entry) => entry.id === 'newer')?.isNewest).toBe(true);
    expect(entries.find((entry) => entry.id === 'older')?.isNewest).toBe(false);
  });

  it('returns nothing for a read with no logs', () => {
    expect(toEntryViews([], print)).toEqual([]);
  });
});

describe('toDayGroups', () => {
  it('gathers two sessions from the same day under one heading', () => {
    const groups = toDayGroups(
      toEntryViews(
        [
          buildPageLog({ id: 'first', logged_on: '2025-06-15', page_start: 0, page_end: 40 }),
          buildPageLog({ id: 'second', logged_on: '2025-06-15', page_start: 40, page_end: 90 }),
        ],
        print
      )
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].dayLabel).toBe('Jun 15');
    expect(groups[0].entries.map((entry) => entry.id)).toEqual(['second', 'first']);
  });

  it('keeps separate days apart, newest first', () => {
    const groups = toDayGroups(
      toEntryViews(
        [
          buildPageLog({ id: 'older', logged_on: '2025-06-14' }),
          buildPageLog({ id: 'newer', logged_on: '2025-06-15' }),
        ],
        print
      )
    );

    expect(groups.map((group) => group.loggedOn)).toEqual(['2025-06-15', '2025-06-14']);
  });

  it('returns nothing for a read with no entries', () => {
    expect(toDayGroups([])).toEqual([]);
  });
});
