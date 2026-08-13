import { useState } from 'react';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useEngagementsGetEngagementSuspense,
  useEngagementsUpdateEngagementDates,
} from '@/api/generated/engagements/engagements';
import { ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { CoverImage } from '@/components/common/cover-image';
import { FormatIcons } from '@/components/common/format-icons';
import { ProgressLogSheet } from '@/components/common/progress-log-sheet';
import { ReadingProgress } from '@/components/common/reading-progress';
import { Button } from '@/components/ui/button';
import { authorNames, coverSrc } from '@/utils/book';
import { STATUSES } from '@/utils/status';
import { invalidateRead } from '../utils/invalidate-read';
import { EntryList } from './entry-list';
import { InlineDateEdit } from './inline-date-edit';

// One read's page. Its history is all it holds today, which is why the route is
// /reads/:id rather than /reads/:id/history -- stats or editions can land here later
// without a URL migration.
//
// The id arrives as a prop rather than being read off the URL here, so the book page can
// mount this without a route of its own being involved.
export function ReadHistory({ engagementId }: { engagementId: string }) {
  const { data: engagement } = useEngagementsGetEngagementSuspense(engagementId);
  const [logging, setLogging] = useState(false);

  // Logging is only an action while the read is in progress. The sheet posts against the
  // read's resume point, which a finished or abandoned read no longer advances.
  const canLog = engagement.status === ReadingStatus.reading;

  return (
    <section>
      <BackLink status={engagement.status} />
      <ReadHeader engagement={engagement} />

      {canLog && (
        <Button className="mb-6 w-full sm:w-auto" onClick={() => setLogging(true)}>
          Log progress
        </Button>
      )}

      {/* Its own query, and still reached only once the read itself resolved -- this
          component suspends above it, so a 404 on the id raises one error, not two. */}
      <EntryList
        engagementId={engagementId}
        onLogProgress={canLog ? () => setLogging(true) : undefined}
      />

      {canLog && (
        <ProgressLogSheet engagement={engagement} open={logging} onOpenChange={setLogging} />
      )}
    </section>
  );
}

// A real link to the hierarchy's parent rather than `navigate(-1)`: this survives a reload
// and a cold load of the URL, where there is no history entry to go back to.
//
// When the book page exists it becomes the parent of all three and this collapses.
function BackLink({ status }: { status: ReadingStatus }) {
  // A read can also be tbr or interested, neither of which this page is reachable from.
  const shelf = STATUSES[status as keyof typeof STATUSES] ?? STATUSES[ReadingStatus.reading];
  // Names the screen you came from, whose heading is Currently Reading -- not the status,
  // which everywhere else is just "Reading".
  const label = status === ReadingStatus.reading ? 'Currently reading' : shelf.label;

  return (
    <Button variant="ghost" size="sm" className="-ml-3 mb-2" render={<Link to={shelf.to} />}>
      <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
      {label}
    </Button>
  );
}

// The dates that bound a read, as a list rather than a hardcoded Started/Finished pair.
// The engagement carries six lifecycle dates (ADR-0008) and the API exposes three today,
// so the shape that grows is a list; the pair is just what that list holds now.
//
// `field: null` means "show it, don't open it" -- PATCH /dates takes started_on and
// finished_on and nothing else, so an abandoned date is readable and not writable.
function dateFields(engagement: EngagementRead) {
  const started = {
    field: 'started_on' as const,
    prefix: 'Started',
    label: 'start date',
    value: engagement.started_on,
  };

  return engagement.status === ReadingStatus.dnf
    ? [
        started,
        { field: null, prefix: 'Abandoned', label: 'abandon date', value: engagement.abandoned_on },
      ]
    : [
        started,
        {
          field: 'finished_on' as const,
          prefix: 'Finished',
          label: 'finish date',
          value: engagement.finished_on,
        },
      ];
}

// Identity, progress and the read's dates.
function ReadHeader({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, completion_pct } = engagement;

  const queryClient = useQueryClient();
  const updateDates = useEngagementsUpdateEngagementDates<DetailError>({
    mutation: {
      onSuccess: () => invalidateRead(queryClient, engagement.id),
    },
  });

  return (
    <header className="mb-6 flex items-start gap-4">
      <CoverImage src={coverSrc(engagement)} title={book.title} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-1.5">
          <h1 className="text-xl leading-tight font-semibold">{book.title}</h1>
          <FormatIcons formats={formats} />
        </div>

        <p className="truncate text-sm text-muted-foreground">{authorNames(book)}</p>

        <ReadingProgress title={book.title} pct={completion_pct} />

        <div className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
          {dateFields(engagement).map(({ field, prefix, label, value }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              {prefix}
              <InlineDateEdit
                value={value}
                label={label}
                disabled={field === null}
                onSave={(next) =>
                  field &&
                  updateDates.mutate({ engagementId: engagement.id, data: { [field]: next } })
                }
              />
            </span>
          ))}
        </div>

        {/* The editor has already closed by the time a rejection lands, so the message
            goes here rather than inside the control that caused it. */}
        {updateDates.isError && (
          <p role="alert" className="text-sm text-destructive">
            {errorDetail(updateDates.error, "Couldn't save that date. Please try again.")}
          </p>
        )}
      </div>
    </header>
  );
}
