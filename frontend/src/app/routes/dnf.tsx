import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EngagementShelf } from '@/features/library/components/engagement-shelf';

export function Dnf() {
  return (
    <EngagementShelf
      status={ReadingStatus.dnf}
      heading="DNF"
      emptyTitle="Nothing abandoned"
      emptyDescription="Books you stop reading part-way show up here."
    />
  );
}
