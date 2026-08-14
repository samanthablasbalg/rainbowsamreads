import { useEngagementsListEngagementsSuspense } from '@/api/generated/engagements/engagements';
import type { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EmptyState } from '@/components/common/empty-state';
import { EngagementRow } from './engagement-row';

export function EngagementShelf({
  status,
  heading,
  emptyTitle,
  emptyDescription,
}: {
  status: ReadingStatus;
  heading: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { data: engagements } = useEngagementsListEngagementsSuspense({ status });

  return (
    <section>
      <h1 className="sr-only">{heading}</h1>

      {engagements.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="flex flex-col gap-3">
          {engagements.map((engagement) => (
            <EngagementRow key={engagement.id} engagement={engagement} />
          ))}
        </ul>
      )}
    </section>
  );
}
