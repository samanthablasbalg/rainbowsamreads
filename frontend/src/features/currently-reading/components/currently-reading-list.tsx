import { useEngagementsListEngagementsSuspense } from '@/api/generated/engagements/engagements';
import { useInsightsGetStreak } from '@/api/generated/insights/insights';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { EmptyState } from '@/components/common/empty-state';
import { localIsoDate } from '@/utils/local-date';
import { CurrentReadRow } from './current-read-row';
import { Streak } from './streak';

export function CurrentlyReadingList() {
  const { data: engagements } = useEngagementsListEngagementsSuspense({
    status: ReadingStatus.reading,
  });

  const date = localIsoDate();
  const { data, isPending, isError } = useInsightsGetStreak({ date });

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-3 pr-6">
        <h1 className="text-2xl font-semibold">Currently Reading</h1>
        <div className="flex items-center gap-3">
          {engagements.length > 0 && (
            <p className="text-sm">
              {engagements.length} {engagements.length === 1 ? 'book' : 'books'}
            </p>
          )}
          {!isPending && !isError && data && (
            <>
              {engagements.length > 0 && <span aria-hidden="true">·</span>}
              <Streak data={data} />
            </>
          )}
        </div>
      </div>

      {engagements.length === 0 ? (
        <EmptyState title="Nothing in progress" description="Books you're reading show up here." />
      ) : (
        <ul className="flex flex-col gap-3">
          {engagements.map((engagement) => (
            <CurrentReadRow key={engagement.id} engagement={engagement} />
          ))}
        </ul>
      )}
    </section>
  );
}
