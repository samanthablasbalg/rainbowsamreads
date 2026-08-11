import { useEngagementsListEngagements } from '@/api/generated/engagements/engagements';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { ErrorState } from '@/components/common/error-state';
import { Pending } from '@/components/common/pending';
import { Button } from '@/components/ui/button';
import { ReadingCard } from './reading-card';

// The landing screen -- a thin shell around one list today, per ADR-0020, so a richer
// home page later is additive rather than a rewrite.
//
// Ordering is the backend's job (most-recent-activity, computed on load): this renders
// whatever order `GET /api/engagements` returns rather than re-sorting client-side.
export function CurrentlyReading() {
  const {
    data: engagements,
    isPending,
    isError,
    error,
    refetch,
  } = useEngagementsListEngagements({
    status: ReadingStatus.reading,
  });

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">Currently Reading</h1>

      {isPending && <Pending />}
      {isError && (
        <ErrorState
          error={error}
          action={
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {engagements && engagements.length === 0 && <p>No books in progress</p>}

      {engagements && engagements.length > 0 && (
        <ul className="flex flex-col gap-3">
          {engagements.map((engagement) => (
            <ReadingCard key={engagement.id} engagement={engagement} />
          ))}
        </ul>
      )}
    </section>
  );
}
