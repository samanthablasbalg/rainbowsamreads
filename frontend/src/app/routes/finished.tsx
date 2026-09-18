import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EndedReadList } from '@/features/library/components/ended-read-list';

export function Finished() {
  return (
    <EndedReadList
      status={ReadingStatus.finished}
      heading="Finished"
      emptyTitle="Nothing finished yet"
      emptyDescription="Books you finish reading show up here."
    />
  );
}
