import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { localIsoDate } from './local-date';

export type ShelvedStatus = Extract<ReadingStatus, 'tbr' | 'reading' | 'finished' | 'dnf'>;

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  tbr: 'To Be Read',
  reading: 'Reading',
  finished: 'Finished',
  paused: 'Paused',
  dnf: 'DNF',
};

export const STATUSES: Record<ShelvedStatus, { label: string; to: string }> = {
  tbr: { label: STATUS_LABELS.tbr, to: '/library/tbr' },
  reading: { label: STATUS_LABELS.reading, to: '/home' },
  finished: { label: STATUS_LABELS.finished, to: '/library/finished' },
  dnf: { label: STATUS_LABELS.dnf, to: '/library/dnf' },
};

export const SHELVED_STATUSES = Object.keys(STATUSES) as ShelvedStatus[];

// A DNF carries no date of its own: giving up isn't an event, so the backend dates it
// from the last session actually logged. Sending today would override that derivation.
export function statusUpdateBody(status: ShelvedStatus) {
  return status === ReadingStatus.dnf ? { status } : { status, effective_on: localIsoDate() };
}
