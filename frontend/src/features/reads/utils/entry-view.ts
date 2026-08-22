import type {
  EngagementRead,
  MinuteProgressLogRead,
  PageProgressLogRead,
} from '@/api/generated/readingTracker.schemas';
import { formatIsoDate } from '@/utils/format-date';
import { formatMinutesAsHhmm } from '@/utils/format-minutes';

// The API has no name for the union it returns, so this is it.
export type ProgressLog = PageProgressLogRead | MinuteProgressLogRead;

export type EntryView = {
  id: string;
  // The whole date, still: the edit sheet titles itself with it and the delete
  // confirmation names the session by it. The timeline's own header splits it in two.
  dateLabel: string;
  dayLabel: string;
  weekdayLabel: string;
  rangeLabel: string;
  fromLabel: string;
  toLabel: string;
  amountLabel: string;
  isNewest: boolean;
  loggedOn: string;
  isAudio: boolean;
  start: number;
  end: number;
  // Where this session sits in the book, 0-100, for the span bar. Measured against the
  // length of *this entry's* format rather than the read's, so a read bound in both
  // still places each session against the thing it was read in.
  startPct: number;
  endPct: number;
  note: string | null;
};

export type DayGroup = {
  loggedOn: string;
  dayLabel: string;
  weekdayLabel: string;
  entries: EntryView[];
};

export function toEntryViews(logs: ProgressLog[], engagement: EngagementRead): EntryView[] {
  const newestId = logs.length > 0 ? logs[logs.length - 1].id : null;

  return logs.map((log) => toEntryView(log, log.id === newestId, engagement)).reverse();
}

// Consecutive entries on one date share a header, so a second session the same day
// doesn't repeat it. Folded rather than bucketed by date: the list is already ordered,
// and two runs of the same date arriving apart would be a bug in the ordering, not two
// groups to merge.
export function toDayGroups(entries: EntryView[]): DayGroup[] {
  return entries.reduce<DayGroup[]>((groups, entry) => {
    const open = groups.at(-1);

    if (open?.loggedOn === entry.loggedOn) open.entries.push(entry);
    else
      groups.push({
        loggedOn: entry.loggedOn,
        dayLabel: entry.dayLabel,
        weekdayLabel: entry.weekdayLabel,
        entries: [entry],
      });

    return groups;
  }, []);
}

function toEntryView(log: ProgressLog, isNewest: boolean, engagement: EngagementRead): EntryView {
  // `in` rather than the `type` discriminant: the generated union types it as optional,
  // so narrowing on the columns that actually differ cannot disagree with the payload.
  const isAudio = 'minute_end' in log;
  const [start, end] = isAudio
    ? [log.minute_start, log.minute_end]
    : [log.page_start, log.page_end];

  const length = isAudio ? engagement.length_minutes : engagement.length_pages;
  const [fromLabel, toLabel] = isAudio
    ? [formatMinutesAsHhmm(start), formatMinutesAsHhmm(end)]
    : [`p. ${start}`, `p. ${end}`];

  return {
    id: log.id,
    dateLabel: formatIsoDate(log.logged_on, { weekday: 'short' }),
    dayLabel: formatIsoDate(log.logged_on, { year: undefined }),
    weekdayLabel: formatIsoDate(log.logged_on, {
      weekday: 'short',
      day: undefined,
      month: undefined,
      year: undefined,
    }),
    rangeLabel: isAudio
      ? `${formatMinutesAsHhmm(start)}–${formatMinutesAsHhmm(end)}`
      : `pp. ${start}–${end}`,
    fromLabel,
    toLabel,
    amountLabel: `+${end - start} ${isAudio ? 'min' : 'pp'}`,
    isNewest,
    loggedOn: log.logged_on,
    isAudio,
    start,
    end,
    startPct: toPct(start, length),
    endPct: toPct(end, length),
    note: log.note,
  };
}

// A read always has a length for the format it is bound in, so the null arm is the
// generated type's, not a state the UI is designed around.
function toPct(position: number, length: number | null): number {
  if (!length) return 0;
  return Math.max(0, Math.min(100, (position / length) * 100));
}
