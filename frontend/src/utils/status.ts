import {
  EngagementStatusUpdateStatus,
  type EngagementStatusUpdate,
  type ReadingStatus,
} from '@/api/generated/readingTracker.schemas';
import { localIsoDate } from './local-date';

type ShelvedStatus = Extract<ReadingStatus, 'reading' | 'finished' | 'dnf'>;

export const STATUSES: Record<ShelvedStatus, { label: string; to: string }> = {
  reading: { label: 'Reading', to: '/home' },
  finished: { label: 'Finished', to: '/library/finished' },
  dnf: { label: 'DNF', to: '/library/dnf' },
};

// A DNF carries no date of its own: giving up isn't an event, so the backend dates it
// from the last session actually logged. Sending today would override that derivation.
export function statusUpdateBody(status: EngagementStatusUpdateStatus): EngagementStatusUpdate {
  return status === EngagementStatusUpdateStatus.dnf
    ? { status }
    : { status, effective_on: localIsoDate() };
}
