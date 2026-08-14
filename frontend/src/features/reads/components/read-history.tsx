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
import { ErrorText } from '@/components/common/error-text';
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
export function ReadHistory({ engagementId }: { engagementId: string }) {
  const { data: engagement } = useEngagementsGetEngagementSuspense(engagementId);
  const [logging, setLogging] = useState(false);

  // The sheet posts against the read's resume point, which a finished or abandoned read
  // no longer advances. Update when reflow is implemented.
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

function BackLink({ status }: { status: ReadingStatus }) {
  // A read can also be tbr or interested, neither of which this page is reachable from.
  const shelf = STATUSES[status as keyof typeof STATUSES] ?? STATUSES[ReadingStatus.reading];
  const label = status === ReadingStatus.reading ? 'Currently reading' : shelf.label;

  return (
    <Button variant="ghost" size="sm" className="-ml-3 mb-2" render={<Link to={shelf.to} />}>
      <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
      {label}
    </Button>
  );
}

// `field: null` means "show it, don't open it": PATCH /dates takes started_on and
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
          <ErrorText>
            {errorDetail(updateDates.error, "Couldn't save that date. Please try again.")}
          </ErrorText>
        )}
      </div>
    </header>
  );
}
