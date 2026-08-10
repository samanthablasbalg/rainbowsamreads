import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useEngagementsGetEngagement } from '@/api/generated/engagements/engagements';
import { ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { CoverImage } from '@/components/common/cover-image';
import { FormatIcons } from '@/components/common/format-icons';
import { Pending } from '@/components/common/pending';
import { ReadingProgress } from '@/components/common/reading-progress';
import { Button } from '@/components/ui/button';
import { formatIsoDate } from '@/utils/format-date';
import { EntryList } from './entry-list';

// One read's page. Its history is all it holds today, which is why the route is
// /reads/:id rather than /reads/:id/history -- stats or editions can land here later
// without a URL migration.
//
// The id arrives as a prop rather than being read off the URL here, so the book page can
// mount this without a route of its own being involved.
export function ReadHistory({ engagementId }: { engagementId: string }) {
  const { data: engagement, isPending, isError } = useEngagementsGetEngagement(engagementId);

  return (
    <section>
      {/* A link to the hierarchy's parent, not `navigate(-1)`: this survives a reload and
          a cold load of the URL, where there is no history entry to go back to. /home is
          truthful today because the Currently Reading card menu is the only way in; when
          the book page exists this points at the book instead. */}
      <Button variant="ghost" size="sm" className="-ml-3 mb-2" render={<Link to="/home" />}>
        <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
        Currently reading
      </Button>

      {isPending && <Pending />}
      {isError && <p role="alert">Couldn&apos;t load this read. Try reloading the page.</p>}

      {engagement && (
        <>
          <ReadHeader engagement={engagement} />
          {/* Its own query, mounted only once the read itself resolved -- a 404 on the id
              would otherwise raise two errors for one cause. */}
          <EntryList engagementId={engagementId} />
        </>
      )}
    </section>
  );
}

// Identity, progress and the two dates that bound the read. The dates are text for now
// and become editable in their own step.
function ReadHeader({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, cover_url, completion_pct, started_on } = engagement;
  const isDnf = engagement.status === ReadingStatus.dnf;
  const endedOn = isDnf ? engagement.abandoned_on : engagement.finished_on;

  const dates: string[] = [];
  if (started_on) dates.push(`Started ${formatIsoDate(started_on)}`);
  if (endedOn) dates.push(`${isDnf ? 'Abandoned' : 'Finished'} ${formatIsoDate(endedOn)}`);

  return (
    <header className="mb-6 flex items-start gap-4">
      <CoverImage src={cover_url ?? book.default_cover_url} title={book.title} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <h1 className="text-xl leading-tight font-semibold">{book.title}</h1>
          <FormatIcons formats={formats} />
        </div>

        <p className="truncate text-sm text-muted-foreground">
          {book.authors.map((author) => author.name).join(', ')}
        </p>

        <ReadingProgress title={book.title} pct={completion_pct} />

        {dates.length > 0 && <p className="text-sm text-muted-foreground">{dates.join(' · ')}</p>}
      </div>
    </header>
  );
}
