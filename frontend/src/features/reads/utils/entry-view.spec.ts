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

  describe('a session split at the frontier', () => {
    // What the backend stores for "at p. 100, read 80 to 130": the 80-100 it had already
    // covered, then the 100-130 it hadn't, written by one save so they share created_at.
    const savedAt = '2025-06-15T09:30:00.000Z';
    const split = [
      buildPageLog({
        id: 're',
        created_at: savedAt,
        new_ground: false,
        page_start: 80,
        page_end: 100,
      }),
      buildPageLog({
        id: 'new',
        created_at: savedAt,
        page_start: 100,
        page_end: 130,
        note: 'Caught up.',
      }),
    ];

    it('folds the two rows into one entry spanning both', () => {
      const entries = toEntryViews(split, print);

      expect(entries).toHaveLength(1);
      expect(entries[0].fromLabel).toBe('p. 80');
      expect(entries[0].toLabel).toBe('p. 130');
    });

    it('counts the whole span read, not just the new ground', () => {
      expect(toEntryViews(split, print)[0].amountLabel).toBe('+50 pp');
    });

    it('names the bar with the frontier it crossed, which no other label carries', () => {
      expect(toEntryViews(split, print)[0].spanLabel).toBe(
        'Re-read p. 80 to p. 100, then new ground to p. 130'
      );
    });

    it('addresses the entry by the new-ground row, which carries the note', () => {
      const [entry] = toEntryViews(split, print);

      expect(entry.id).toBe('new');
      expect(entry.note).toBe('Caught up.');
    });

    it('marks the frontier it crossed, so the card can colour each half', () => {
      const [entry] = toEntryViews(split, print);

      expect(entry.hasNewGround).toBe(true);
      expect(entry.splitAt).toBe(100);
      expect(entry.splitPct).toBe(50);
    });

    it('keeps a separate save on the same day as its own entry', () => {
      const entries = toEntryViews([...split, buildPageLog({ id: 'later' })], print);

      expect(entries.map((entry) => entry.id)).toEqual(['later', 'new']);
    });
  });

  describe('a session entirely behind the frontier', () => {
    const reread = [buildPageLog({ new_ground: false, page_start: 20, page_end: 60 })];

    it('gives the whole span to the re-read half', () => {
      const [entry] = toEntryViews(reread, print);

      expect(entry.hasNewGround).toBe(false);
      expect(entry.splitAt).toBe(60);
      expect(entry.splitPct).toBe(30);
    });

    it('states the pages read without claiming completion moved', () => {
      const [entry] = toEntryViews(reread, print);

      expect(entry.amountLabel).toBe('40 pp');
      expect(entry.spanLabel).toBe('Re-read, p. 20 to p. 60');
    });
  });

  describe('the frontier each session found', () => {
    it('is where the one before it ended', () => {
      const entries = toEntryViews(
        [
          buildPageLog({ page_start: 0, page_end: 40 }),
          buildPageLog({ page_start: 40, page_end: 90 }),
        ],
        print
      );

      expect(entries.map((entry) => entry.coveredPct)).toEqual([20, 0]);
    });

    it('holds where it was through a re-read, and stays there for what follows', () => {
      const entries = toEntryViews(
        [
          buildPageLog({ page_start: 0, page_end: 120 }),
          buildPageLog({ new_ground: false, page_start: 20, page_end: 60 }),
          buildPageLog({ page_start: 120, page_end: 140 }),
        ],
        print
      );

      expect(entries.map((entry) => entry.coveredPct)).toEqual([60, 60, 0]);
    });

    it('starts a read at nothing covered', () => {
      const [entry] = toEntryViews([buildPageLog({ page_start: 0, page_end: 40 })], print);

      expect(entry.coveredPct).toBe(0);
    });
  });

  it('gives an unsplit session no re-read half at all', () => {
    const [entry] = toEntryViews([buildPageLog({ page_start: 50, page_end: 100 })], print);

    expect(entry.hasNewGround).toBe(true);
    expect(entry.splitAt).toBe(50);
    expect(entry.splitPct).toBe(entry.startPct);
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
