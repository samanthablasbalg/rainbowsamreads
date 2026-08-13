import { useEngagementsListEngagementsSuspense } from '@/api/generated/engagements/engagements';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { ReadingCard } from './reading-card';

// The landing screen -- a thin shell around one list today, per ADR-0020, so a richer
// home page later is additive rather than a rewrite.
//
// Ordering is the backend's job (most-recent-activity, computed on load): this renders
// whatever order `GET /api/engagements` returns rather than re-sorting client-side.
export function CurrentlyReading() {
  const { data: engagements } = useEngagementsListEngagementsSuspense({
    status: ReadingStatus.reading,
  });

  return (
    <section>
      {/* `items-baseline` so the count sits on the heading's baseline rather than centred
          against its line box. Only rendered once there are books: at zero the empty state
          below already says so, and "0 books" beside it would say it twice. */}
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold">Currently Reading</h1>
        {engagements.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {engagements.length} {engagements.length === 1 ? 'book' : 'books'}
          </p>
        )}
      </div>

      {engagements.length === 0 ? (
        <p>No books in progress</p>
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
