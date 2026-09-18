import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EngagementShelf } from '@/features/library/components/engagement-shelf';

export function ToRead() {
  return (
    <EngagementShelf
      status={ReadingStatus.tbr}
      heading="To Read"
      emptyTitle="Nothing to read yet"
      emptyDescription="Books you want to read will show up here."
    />
  );
}
