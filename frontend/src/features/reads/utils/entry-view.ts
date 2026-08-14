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
