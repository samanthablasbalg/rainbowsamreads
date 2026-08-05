import { useEngagementsListEngagements } from '@/api/generated/engagements/engagements';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { Pending } from '@/components/common/pending';
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
  } = useEngagementsListEngagements({
    status: ReadingStatus.reading,
  });

  return (
    <section>
      <h1 className="mb-4 text-2xl font-semibold">Currently Reading</h1>

      {isPending && <Pending />}
      {isError && <p role="alert">Couldn&apos;t load your books. Try reloading the page.</p>}

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
