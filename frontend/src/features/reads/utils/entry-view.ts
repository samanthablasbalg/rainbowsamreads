import type {
  MinuteProgressLogRead,
  PageProgressLogRead,
} from '@/api/generated/readingTracker.schemas';
import { formatIsoDate } from '@/utils/format-date';
import { formatMinutesAsHhmm } from '@/utils/format-minutes';

// The API has no name for the union it returns, so this is it.
export type ProgressLog = PageProgressLogRead | MinuteProgressLogRead;

// What a row renders, with every API shape already resolved. Rows never branch on
// page-vs-minute themselves: a standalone entry (ADR-0011) carries neither a range nor an
// engagement and will map to this same shape from entirely different columns, and that
// only stays cheap if the mapping lives in one place.
export type EntryView = {
  id: string;
  dateLabel: string;
  rangeLabel: string;
  amountLabel: string;
  isNewest: boolean;
  // The raw values the editor seeds itself from and validates against. Here rather than
  // fetched again by the sheet: the row and its editor are two views of one entry, and
  // this is the shape both read.
  loggedOn: string;
  isAudio: boolean;
  start: number;
  end: number;
};

// Newest first, which is the order the list renders in: the newest entry is the only one
// whose position can be edited or deleted, and it is the one most likely to need fixing.
//
// `isNewest` is "the newest entry of this read", not "first in the rendered list". They
// are the same thing here and will stop being the same the first time a page renders more
// than one read's entries -- the book page, or a global feed -- so the flag is set from
// the read's own ordering before anything is reversed.
//
// That ordering is the backend's: it returns logs ascending by (logged_on, created_at),
// which is the same key its "is this the latest?" check uses, so the last element is the
// entry the API will accept edits for.
export function toEntryViews(logs: ProgressLog[]): EntryView[] {
  const newestId = logs.length > 0 ? logs[logs.length - 1].id : null;

  return logs.map((log) => toEntryView(log, log.id === newestId)).reverse();
}

function toEntryView(log: ProgressLog, isNewest: boolean): EntryView {
  // A weekday reads as a reading habit in a way a bare date does not, and it is the
  // cheapest version of that: no extra request, no derived stat.
  const dateLabel = formatIsoDate(log.logged_on, { weekday: 'short' });

  // `in` rather than the `type` discriminant: the generated union types it as optional,
  // so narrowing on the columns that actually differ cannot disagree with the payload.
  if ('minute_end' in log) {
    return {
      id: log.id,
      dateLabel,
      rangeLabel: `${formatMinutesAsHhmm(log.minute_start)}–${formatMinutesAsHhmm(log.minute_end)}`,
      amountLabel: `+${log.minute_end - log.minute_start} min`,
      isNewest,
      loggedOn: log.logged_on,
      isAudio: true,
      start: log.minute_start,
      end: log.minute_end,
    };
  }

  return {
    id: log.id,
    dateLabel,
    rangeLabel: `pp. ${log.page_start}–${log.page_end}`,
    amountLabel: `+${log.page_end - log.page_start} pp`,
    isNewest,
    loggedOn: log.logged_on,
    isAudio: false,
    start: log.page_start,
    end: log.page_end,
  };
}
