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
  fromLabel: string;
  toLabel: string;
  amountLabel: string;
  isNewest: boolean;
  loggedOn: string;
  isAudio: boolean;
  start: number;
  end: number;
  // Whether the session reached ground the read hadn't covered before. False for a pure
  // re-read, which moved no completion.
  hasNewGround: boolean;
  // The boundary between the re-read half of the session and the new half: the frontier
  // it crossed. Collapses to `start` when nothing was re-read and to `end` when nothing
  // was new, so the two halves always tile the span.
  splitAt: number;
  // Where this session sits in the book, 0-100, for the span bar. Measured against the
  // length of *this entry's* format rather than the read's, so a read bound in both
  // still places each session against the thing it was read in.
  startPct: number;
  splitPct: number;
  endPct: number;
  // How far the read had got before this session, 0-100 on the same axis: the frontier
  // as of this entry, not the read's completion today. A new-ground session starts at
  // the frontier, so the two coincide; a re-read is the case where they don't, and the
  // bar has to keep showing the ground the read had already covered ahead of it.
  coveredPct: number;
  note: string | null;
};

export type DayGroup = {
  loggedOn: string;
  // The header shows the day and weekday; the whole date, year included, names the
  // group's list. Cards no longer carry a date of their own, so without this the year
  // is nowhere on the page and a session is announced with no date at all.
  dateLabel: string;
  dayLabel: string;
  weekdayLabel: string;
  entries: EntryView[];
};

export function toEntryViews(logs: ProgressLog[], engagement: EngagementRead): EntryView[] {
  const sessions = toSessions(logs);

  // The frontier each session found, carried forward as the list is walked oldest first.
  // It is the same high-water mark the backend takes completion from -- the furthest end
  // reached, each measured against its own ruler -- so a re-read leaves it where it was.
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
// one transaction; separate saves never can. Folded rather than bucketed for the same
// reason toDayGroups is: the API already sorts on that key, so a group arriving in two
// runs would be an ordering bug, not two runs to merge.
function toSessions(logs: ProgressLog[]): ProgressLog[][] {
  return logs.reduce<ProgressLog[][]>((sessions, log) => {
    const open = sessions.at(-1);

    if (open?.[0].created_at === log.created_at) open.push(log);
    else sessions.push([log]);

    return sessions;
  }, []);
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
        dateLabel: entry.dateLabel,
        dayLabel: entry.dayLabel,
        weekdayLabel: entry.weekdayLabel,
        entries: [entry],
      });

    return groups;
  }, []);
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

  // `in` rather than the `type` discriminant: the generated union types it as optional,
  // so narrowing on the columns that actually differ cannot disagree with the payload.
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
    // The whole span, since that is what was read -- but a pure re-read moved no
    // completion, so it doesn't get to claim a `+`.
    amountLabel: `${hasNewGround ? '+' : ''}${end - start} ${unit}`,
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

function spanOf(log: ProgressLog): [number, number] {
  return 'minute_end' in log ? [log.minute_start, log.minute_end] : [log.page_start, log.page_end];
}

// A read always has a length for the format it is bound in, so the null arm is the
// generated type's, not a state the UI is designed around.
function toPct(position: number, length: number | null): number {
  if (!length) return 0;
  return Math.max(0, Math.min(100, (position / length) * 100));
}
