import { useEngagementsListEngagementsSuspense } from '@/api/generated/engagements/engagements';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EmptyState } from '@/components/common/empty-state';
import { ToReadRow } from './to-read-row';

export function ToReadList() {
  const { data: engagements } = useEngagementsListEngagementsSuspense({
    status: ReadingStatus.tbr,
  });

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">To Read</h1>
        {engagements.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {engagements.length} {engagements.length === 1 ? 'book' : 'books'}
          </p>
        )}
      </div>

      {engagements.length === 0 ? (
        <EmptyState
          title="Nothing to read yet"
          description="Books you want to read will show up here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {engagements.map((engagement) => (
            <ToReadRow key={engagement.id} engagement={engagement} />
          ))}
        </ul>
      )}
    </section>
  );
}
