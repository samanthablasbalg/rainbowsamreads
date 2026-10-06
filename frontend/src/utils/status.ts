import {
  CreatableReadingStatus,
  EndedReadingStatus,
  OpenReadingStatus,
  ReadingStatus,
} from '@/api/generated/readingTracker.schemas';
import { localIsoDate } from './local-date';

export const CREATABLE_STATUSES: readonly CreatableReadingStatus[] =
  Object.values(CreatableReadingStatus);

const OPEN_STATUSES: ReadonlySet<ReadingStatus> = new Set(Object.values(OpenReadingStatus));
const ENDED_STATUSES: ReadonlySet<ReadingStatus> = new Set(Object.values(EndedReadingStatus));

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  tbr: 'To Be Read',
  reading: 'Reading',
  finished: 'Finished',
  paused: 'Paused',
  dnf: 'DNF',
};

export function isOpenStatus(status: ReadingStatus): status is OpenReadingStatus {
  return OPEN_STATUSES.has(status);
}

export function isEndedStatus(status: ReadingStatus): status is EndedReadingStatus {
  return ENDED_STATUSES.has(status);
}

// A DNF carries no date of its own: giving up isn't an event, so the backend dates it
// from the last session actually logged. Sending today would override that derivation.
export function statusUpdateBody(status: CreatableReadingStatus) {
  return status === ReadingStatus.dnf ? { status } : { status, effective_on: localIsoDate() };
}
