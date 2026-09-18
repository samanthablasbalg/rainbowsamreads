import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EndedReadList } from '@/features/library/components/ended-read-list';

export function ToRead() {
  return (
    <EndedReadList
      status={ReadingStatus.tbr}
      heading="To Read"
      emptyTitle="Nothing to read yet"
      emptyDescription="Books you want to read will show up here."
    />
  );
}
