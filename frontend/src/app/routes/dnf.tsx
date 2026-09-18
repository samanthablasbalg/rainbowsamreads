import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EndedReadList } from '@/features/library/components/ended-read-list';

export function Dnf() {
  return (
    <EndedReadList
      status={ReadingStatus.dnf}
      heading="DNF"
      emptyTitle="Nothing abandoned"
      emptyDescription="Books you stop reading part-way show up here."
    />
  );
}
