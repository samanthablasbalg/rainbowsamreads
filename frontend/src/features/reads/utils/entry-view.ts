import type {
  MinuteProgressLogRead,
  PageProgressLogRead,
} from '@/api/generated/readingTracker.schemas';
import { formatIsoDate } from '@/utils/format-date';
import { formatMinutesAsHhmm } from '@/utils/format-minutes';

// The API has no name for the union it returns, so this is it.
export type ProgressLog = PageProgressLogRead | MinuteProgressLogRead;

export type EntryView = {
  id: string;
  dateLabel: string;
  rangeLabel: string;
  amountLabel: string;
  isNewest: boolean;
  loggedOn: string;
  isAudio: boolean;
  start: number;
  end: number;
};

export function toEntryViews(logs: ProgressLog[]): EntryView[] {
  const newestId = logs.length > 0 ? logs[logs.length - 1].id : null;

  return logs.map((log) => toEntryView(log, log.id === newestId)).reverse();
}

function toEntryView(log: ProgressLog, isNewest: boolean): EntryView {
  // `in` rather than the `type` discriminant: the generated union types it as optional,
  // so narrowing on the columns that actually differ cannot disagree with the payload.
  const isAudio = 'minute_end' in log;
  const [start, end] = isAudio
    ? [log.minute_start, log.minute_end]
    : [log.page_start, log.page_end];

  return {
    id: log.id,
    dateLabel: formatIsoDate(log.logged_on, { weekday: 'short' }),
    rangeLabel: isAudio
      ? `${formatMinutesAsHhmm(start)}–${formatMinutesAsHhmm(end)}`
      : `pp. ${start}–${end}`,
    amountLabel: `+${end - start} ${isAudio ? 'min' : 'pp'}`,
    isNewest,
    loggedOn: log.logged_on,
    isAudio,
    start,
    end,
  };
}
