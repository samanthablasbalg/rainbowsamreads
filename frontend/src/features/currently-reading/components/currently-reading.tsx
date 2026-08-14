import { useEngagementsListEngagementsSuspense } from '@/api/generated/engagements/engagements';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EmptyState } from '@/components/common/empty-state';
import { ReadingCard } from './reading-card';

export function CurrentlyReading() {
  const { data: engagements } = useEngagementsListEngagementsSuspense({
    status: ReadingStatus.reading,
  });

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">Currently Reading</h1>
        {engagements.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {engagements.length} {engagements.length === 1 ? 'book' : 'books'}
          </p>
        )}
      </div>

      {engagements.length === 0 ? (
        <EmptyState title="Nothing in progress" description="Books you're reading show up here." />
      ) : (
        <ul className="flex flex-col gap-3">
          {engagements.map((engagement) => (
            <ReadingCard key={engagement.id} engagement={engagement} />
          ))}
        </ul>
      )}
    </section>
  );
}
