import type {
  EngagementRead,
  MinuteProgressLogRead,
  PageProgressLogRead,
} from '@/api/generated/readingTracker.schemas';
import { formatIsoDate } from '@/utils/format-date';
import { formatMinutesAsHhmm } from '@/utils/format-minutes';
import { groupConsecutiveBy } from '@/utils/group-consecutive';

// The API has no name for the union it returns, so this is it.
export type ProgressLog = PageProgressLogRead | MinuteProgressLogRead;

export type EntryView = {
  id: string;
  dateLabel: string;
  dayLabel: string;
  weekdayLabel: string;
  fromLabel: string;
  toLabel: string;
  amountLabel: string;
  spanLabel: string;
  isNewest: boolean;
  loggedOn: string;
  isAudio: boolean;
  start: number;
  end: number;
  hasNewGround: boolean;
  splitAt: number;
  startPct: number;
  splitPct: number;
  endPct: number;
  coveredPct: number;
  note: string | null;
};

export type DayGroup = {
  loggedOn: string;
  dateLabel: string;
  dayLabel: string;
  weekdayLabel: string;
  entries: EntryView[];
};

export function toEntryViews(logs: ProgressLog[], engagement: EngagementRead): EntryView[] {
  const sessions = toSessions(logs);

  let coveredPct = 0;

  return sessions
    .map((rows, index) => {
      const entry = toEntryView(rows, index === sessions.length - 1, engagement, coveredPct);
      coveredPct = Math.max(coveredPct, entry.endPct);
      return entry;
    })
    .reverse();
}

// A session that crossed the frontier is stored as two rows, and the reader thinks of
// the pair as one entry. They share `created_at` to the microsecond, because one save is
// one transaction; separate saves never can.
function toSessions(logs: ProgressLog[]): ProgressLog[][] {
  return groupConsecutiveBy(logs, (log) => log.created_at);
}

// Consecutive entries on one date share a header, so a second session the same day
// doesn't repeat it.
export function toDayGroups(entries: EntryView[]): DayGroup[] {
  const days = groupConsecutiveBy(entries, (entry) => entry.loggedOn);

  return days.map(([first, ...rest], index) => ({
    loggedOn: first.loggedOn,
    dateLabel: first.dateLabel,
    dayLabel: crossesYear(days, index) ? formatIsoDate(first.loggedOn) : first.dayLabel,
    weekdayLabel: first.weekdayLabel,
    entries: [first, ...rest],
  }));
}

// A day next to a day in another year says which year it is, and so does its neighbour:
// a lone "Jan 12" above a "Jan 11" reads as one run of days when it isn't.
function crossesYear(days: EntryView[][], index: number): boolean {
  const yearOf = (day: EntryView[]) => day[0].loggedOn.slice(0, 4);
  const year = yearOf(days[index]);

  return [days[index - 1], days[index + 1]].some(
    (neighbour) => neighbour !== undefined && yearOf(neighbour) !== year
  );
}

// The rows are the session's spans, oldest first, so the last one is the half the
// backend addresses the session by: its id, and the note a split save put on it.
function toEntryView(
  rows: ProgressLog[],
  isNewest: boolean,
  engagement: EngagementRead,
  coveredPct: number
): EntryView {
  const first = rows[0];
  const last = rows[rows.length - 1];

  const isAudio = 'minute_end' in last;
  const [start] = spanOf(first);
  const [newStart, end] = spanOf(last);

  const hasNewGround = last.new_ground;
  const splitAt = hasNewGround ? newStart : end;

  const unit = isAudio ? 'min' : 'pp';
  const length = isAudio ? engagement.length_minutes : engagement.length_pages;
  const [fromLabel, toLabel] = isAudio
    ? [formatMinutesAsHhmm(start), formatMinutesAsHhmm(end)]
    : [`p. ${start}`, `p. ${end}`];

  return {
    id: last.id,
    dateLabel: formatIsoDate(last.logged_on, { weekday: 'short' }),
    dayLabel: formatIsoDate(last.logged_on, { year: undefined }),
    weekdayLabel: formatIsoDate(last.logged_on, {
      weekday: 'short',
      day: undefined,
      month: undefined,
      year: undefined,
    }),
    fromLabel,
    toLabel,
    amountLabel: `${hasNewGround ? '+' : ''}${end - start} ${unit}`,
    spanLabel: spanLabelFor({ fromLabel, toLabel, isAudio, start, splitAt, end }),
    isNewest,
    loggedOn: last.logged_on,
    isAudio,
    start,
    end,
    hasNewGround,
    splitAt,
    startPct: toPct(start, length),
    splitPct: toPct(splitAt, length),
    endPct: toPct(end, length),
    coveredPct,
    note: last.note,
  };
}

function spanLabelFor({
  fromLabel,
  toLabel,
  isAudio,
  start,
  splitAt,
  end,
}: Pick<EntryView, 'fromLabel' | 'toLabel' | 'isAudio' | 'start' | 'splitAt' | 'end'>): string {
  if (splitAt === start) return `New ground, ${fromLabel} to ${toLabel}`;
  if (splitAt === end) return `Re-read, ${fromLabel} to ${toLabel}`;

  const splitLabel = isAudio ? formatMinutesAsHhmm(splitAt) : `p. ${splitAt}`;
  return `Re-read ${fromLabel} to ${splitLabel}, then new ground to ${toLabel}`;
}

function spanOf(log: ProgressLog): [number, number] {
  return 'minute_end' in log ? [log.minute_start, log.minute_end] : [log.page_start, log.page_end];
}

function toPct(position: number, length: number | null): number {
  if (!length) return 0;
  return Math.max(0, Math.min(100, (position / length) * 100));
}
