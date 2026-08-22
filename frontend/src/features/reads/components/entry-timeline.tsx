import { useState, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { HistoryIcon, PauseIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useEngagementsDeleteProgressLog,
  useEngagementsListProgressLogsSuspense,
} from '@/api/generated/engagements/engagements';
import { ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorText } from '@/components/common/error-text';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatIsoDate } from '@/utils/format-date';
import { toDayGroups, toEntryViews, type EntryView } from '../utils/entry-view';
import { invalidateRead } from '../utils/invalidate-read';
import { EntryCard } from './entry-card';
import { EntryEditSheet } from './entry-edit-sheet';

export function EntryTimeline({
  engagement,
  onLogProgress,
}: {
  engagement: EngagementRead;
  onLogProgress?: () => void;
}) {
  const { data: logs } = useEngagementsListProgressLogsSuspense(engagement.id);
  const [editing, setEditing] = useState<EntryView | null>(null);
  const [deleting, setDeleting] = useState<EntryView | null>(null);

  const queryClient = useQueryClient();

  const deleteLog = useEngagementsDeleteProgressLog<DetailError>({
    mutation: {
      onSuccess: () => invalidateRead(queryClient, engagement.id),
    },
  });

  function handleDelete() {
    if (deleting === null) return;
    const logId = deleting.id;
    setDeleting(null);
    deleteLog.mutate({ engagementId: engagement.id, logId });
  }

  // Recomputed every render rather than held in state: editing an entry's date moves it
  // into another day, and the grouping has to follow the data rather than the layout it
  // happened to have when the list first arrived.
  const groups = toDayGroups(toEntryViews(logs, engagement));

  // Only an ended read has a marker at the top for the rail to start from. Without one
  // the first date's row starts the rail at its own dot instead, so the line doesn't
  // stub out above the newest entry with nothing terminating it.
  const ended =
    engagement.status === ReadingStatus.finished || engagement.status === ReadingStatus.dnf;

  return (
    <section aria-labelledby="entry-timeline-heading">
      <h2 id="entry-timeline-heading" className="mb-3 text-lg font-semibold">
        History
      </h2>

      {deleteLog.isError && (
        <ErrorText>
          {errorDetail(deleteLog.error, "Couldn't delete that entry. Please try again.")}
        </ErrorText>
      )}

      {groups.length === 0 && (
        <EmptyState
          icon={HistoryIcon}
          title="Nothing logged yet"
          description="Sessions you log against this read show up here."
          action={onLogProgress && <Button onClick={onLogProgress}>Log progress</Button>}
        />
      )}

      {groups.length > 0 && (
        <div>
          {ended && <EndMarker engagement={engagement} />}

          <ol aria-labelledby="entry-timeline-heading">
            {groups.map((group, index) => (
              <li key={group.loggedOn}>
                <TimelineRow
                  dot={<DayDot />}
                  line={!ended && index === 0 ? 'below' : 'full'}
                  className="py-2"
                >
                  <p className="whitespace-nowrap">
                    <span className="text-sm font-extrabold">{group.dayLabel}</span>
                    <span className="ml-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                      {group.weekdayLabel}
                    </span>
                  </p>
                </TimelineRow>

                <ul aria-label={group.dayLabel}>
                  {group.entries.map((entry) => (
                    <li key={entry.id}>
                      <TimelineRow className="pb-3">
                        <EntryCard entry={entry} onEdit={() => setEditing(entry)} />
                      </TimelineRow>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <StartMarker startedOn={engagement.started_on} />
        </div>
      )}

      {editing && (
        <EntryEditSheet
          engagementId={engagement.id}
          entry={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onRequestDelete={() => {
            setDeleting(editing);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this entry?"
        description={
          deleting
            ? `The session from ${deleting.dateLabel} will be removed and your progress will go back to where it was before it. This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
      />
    </section>
  );
}

// One line per row rather than one down the whole timeline: every row draws it at the
// same x and rows stack, so it reads as continuous without anything having to know the
// height of what it passes. The rail column is a flex child left at its default stretch,
// which is what gives `inset-y-0` a full row to span -- centring it instead would
// collapse the column to the dot's own height and break the line into dashes.
//
// `left-3` is the centre of `w-6`, and the dot is placed at the same coordinate. That is
// what keeps the two aligned, at any dot size, without arithmetic.
function TimelineRow({
  line = 'full',
  dot,
  className,
  children,
}: {
  line?: 'full' | 'below' | 'above';
  dot?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex">
      <div aria-hidden="true" className="relative w-6 shrink-0">
        <div
          className={cn(
            'absolute left-3 w-0.5 -translate-x-1/2 bg-border',
            line === 'full' && 'inset-y-0',
            // Bookends stop at their own dot, so the rail terminates on the marker
            // rather than running past it.
            line === 'below' && 'top-1/2 bottom-0',
            line === 'above' && 'top-0 bottom-1/2'
          )}
        />
        {dot && (
          <div className="absolute top-1/2 left-3 -translate-x-1/2 -translate-y-1/2">{dot}</div>
        )}
      </div>

      <div className={cn('min-w-0 flex-1 pl-2', className)}>{children}</div>
    </div>
  );
}

// Deliberately the same size as the started marker below, filled where that one is
// hollow: both are punctuation on the rail, and only the end marker carries a glyph and
// the weight to go with it.
function DayDot() {
  return <span className="block size-2.5 rounded-full bg-primary ring-2 ring-background" />;
}

function EndMarker({ engagement }: { engagement: EngagementRead }) {
  const finished = engagement.status === ReadingStatus.finished;
  const date = finished ? engagement.finished_on : engagement.abandoned_on;

  return (
    <TimelineRow
      line="below"
      className="py-2"
      dot={
        <span
          className={cn(
            'flex size-5.5 items-center justify-center rounded-full',
            finished ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground text-background'
          )}
        >
          <HugeiconsIcon icon={finished ? Tick02Icon : PauseIcon} size={12} strokeWidth={3} />
        </span>
      }
    >
      <p className="text-sm font-bold">
        {finished ? 'Finished reading' : 'Abandoned reading'}
        {date && (
          <span className="font-semibold text-muted-foreground"> · {formatIsoDate(date)}</span>
        )}
      </p>
    </TimelineRow>
  );
}

function StartMarker({ startedOn }: { startedOn: string | null }) {
  if (startedOn === null) return null;

  return (
    <TimelineRow
      line="above"
      className="py-2"
      dot={<span className="block size-2.5 rounded-full border-2 border-border bg-background" />}
    >
      <p className="text-xs font-bold whitespace-nowrap text-muted-foreground">
        Started reading · {formatIsoDate(startedOn)}
      </p>
    </TimelineRow>
  );
}
