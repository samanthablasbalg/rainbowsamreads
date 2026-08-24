import { useState } from 'react';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useEngagementsGetEngagementSuspense,
  useEngagementsUpdateEngagementDates,
  useEngagementsUpdateEngagementLength,
} from '@/api/generated/engagements/engagements';
import { Format, ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { CoverImage } from '@/components/common/cover-image';
import { ErrorText } from '@/components/common/error-text';
import { FormatIcons } from '@/components/common/format-icons';
import { ProgressLogSheet } from '@/components/common/progress-log-sheet';
import { ReadingProgress } from '@/components/common/reading-progress';
import { Button } from '@/components/ui/button';
import { authorNames, coverSrc } from '@/utils/book';
import { FORMATS } from '@/utils/format';
import { STATUSES } from '@/utils/status';
import { invalidateRead } from '../utils/invalidate-read';
import { EntryTimeline } from './entry-timeline';
import { InlineDateEdit } from './inline-date-edit';
import { InlineLengthEdit } from './inline-length-edit';

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
      <ReadHeader
        engagement={engagement}
        onLogProgress={canLog ? () => setLogging(true) : undefined}
      />

      <EntryTimeline
        engagement={engagement}
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

function ReadHeader({
  engagement,
  onLogProgress,
}: {
  engagement: EngagementRead;
  onLogProgress?: () => void;
}) {
  const { book, formats, completion_pct } = engagement;

  const queryClient = useQueryClient();
  const onSuccess = () => invalidateRead(queryClient, engagement.id);
  const updateDates = useEngagementsUpdateEngagementDates<DetailError>({
    mutation: { onSuccess },
  });
  // Every percentage on the read is derived from this length, so invalidating is all it
  // takes to reflow them -- no log row stores a percentage of its own.
  const updateLength = useEngagementsUpdateEngagementLength<DetailError>({
    mutation: { onSuccess },
  });

  return (
    <header className="mb-6 flex items-start gap-3 sm:gap-4">
      <CoverImage src={coverSrc(engagement)} title={book.title} className="sm:h-33 sm:w-22" />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h1 className="text-xl leading-tight font-bold sm:text-2xl">{book.title}</h1>

        <p className="truncate text-sm text-muted-foreground">{authorNames(book)}</p>

        <div className="flex flex-wrap items-center gap-2">
          <FormatIcons formats={formats} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
          {formats.map((format) => {
            const isAudio = format === Format.audio;
            const label = `${FORMATS[format].label} length`;

            return (
              <span key={format} className="inline-flex items-center gap-1.5">
                {label}
                <InlineLengthEdit
                  label={label.toLowerCase()}
                  value={isAudio ? engagement.length_minutes : engagement.length_pages}
                  isAudio={isAudio}
                  onSave={(next) =>
                    updateLength.mutateAsync({
                      engagementId: engagement.id,
                      data: isAudio ? { length_minutes: next } : { length_pages: next },
                    })
                  }
                />
              </span>
            );
          })}
        </div>

        <ReadingProgress title={book.title} pct={completion_pct} />

        <div className="flex flex-wrap items-center gap-x-4 text-sm text-muted-foreground">
          {dateFields(engagement).map(({ field, prefix, label, value }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              {prefix}
              <InlineDateEdit
                value={value}
                label={label}
                disabled={field === null}
                onSave={async (next) => {
                  if (field)
                    await updateDates.mutateAsync({
                      engagementId: engagement.id,
                      data: { [field]: next },
                    });
                }}
              />
            </span>
          ))}

          {onLogProgress && (
            <Button
              variant="link"
              size="sm"
              className="ml-auto hidden h-auto p-0 font-bold text-brand-pink sm:inline-flex"
              onClick={onLogProgress}
            >
              + Log progress
            </Button>
          )}
        </div>

        {onLogProgress && (
          <Button className="mt-2 w-full sm:hidden" onClick={onLogProgress}>
            Log progress
          </Button>
        )}

        {updateDates.isError && (
          <ErrorText>
            {errorDetail(updateDates.error, "Couldn't save that date. Please try again.")}
          </ErrorText>
        )}
        {updateLength.isError && (
          <ErrorText>
            {errorDetail(updateLength.error, "Couldn't save that length. Please try again.")}
          </ErrorText>
        )}
      </div>
    </header>
  );
}
