import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EngagementShelf } from '@/features/library/components/engagement-shelf';

export function Finished() {
  return (
    <EngagementShelf
      status={ReadingStatus.finished}
      heading="Finished"
      emptyTitle="Nothing finished yet"
      emptyDescription="Books you finish reading show up here."
    />
  );
}
