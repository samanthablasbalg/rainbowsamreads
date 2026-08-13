import type { ReadingStatus } from '@/api/generated/readingTracker.schemas';

type ShelvedStatus = Extract<ReadingStatus, 'reading' | 'finished' | 'dnf'>;

export const STATUSES: Record<ShelvedStatus, { label: string; to: string }> = {
  reading: { label: 'Reading', to: '/home' },
  finished: { label: 'Finished', to: '/library/finished' },
  dnf: { label: 'DNF', to: '/library/dnf' },
};
