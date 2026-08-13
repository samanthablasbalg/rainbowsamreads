import { useState } from 'react';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel02Icon, Delete02Icon, HistoryIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsDeleteEngagement,
  useEngagementsUpdateEngagementStatus,
} from '@/api/generated/engagements/engagements';
import {
  EngagementStatusUpdateStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { BookRow } from '@/components/common/book-row';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormatIcons } from '@/components/common/format-icons';
import { ReadingProgress } from '@/components/common/reading-progress';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { authorNames, coverSrc } from '@/utils/book';
import { localIsoDate } from '@/utils/local-date';
import { ProgressLogSheet } from '@/components/common/progress-log-sheet';

// The three actions that ask before they act, keyed by the state that opens the dialog.
// Copy lives here rather than inline so the three branches read side by side; `title` is
// a function only because the book's name goes in it.
const CONFIRMATIONS = {
  finished: {
    title: (bookTitle: string) => `Mark "${bookTitle}" as finished?`,
    description: 'This moves it out of Currently Reading.',
    confirmLabel: 'Mark finished',
    tone: 'default',
  },
  dnf: {
    title: (bookTitle: string) => `Mark "${bookTitle}" as did not finish?`,
    description: 'This moves it out of Currently Reading.',
    confirmLabel: 'Mark as DNF',
    tone: 'default',
  },
  delete: {
    title: (bookTitle: string) => `Delete this read of "${bookTitle}"?`,
    description: "This removes the read and its progress logs. This can't be undone.",
    confirmLabel: 'Delete',
    tone: 'danger',
  },
} as const;

type ConfirmAction = keyof typeof CONFIRMATIONS;

// Cover-led row per ADR-0020: cover, title, author, format icon(s), progress. Finish,
// DNF and delete each confirm first -- [[0031]] -- then PATCH/DELETE and invalidate the
// engagements list so the card leaves this screen once its status no longer matches.
export function ReadingCard({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, completion_pct } = engagement;
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);

  function invalidateEngagements() {
    queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() });
  }

  const updateStatus = useEngagementsUpdateEngagementStatus({
    mutation: { onSuccess: invalidateEngagements },
  });
  const deleteEngagement = useEngagementsDeleteEngagement({
    mutation: { onSuccess: invalidateEngagements },
  });

  function handleConfirm() {
    if (pendingAction === 'delete') {
      deleteEngagement.mutate({ engagementId: engagement.id });
    } else if (pendingAction !== null) {
      // `effective_on` per ADR-0024 § 3, same as `started_on` on the way in. It lands on
      // `finished_on`/`abandoned_on` and on the completion log the backend writes when a
      // print read is finished short of its last page, so the server's date would date
      // all three to tomorrow for an evening finish behind UTC.
      updateStatus.mutate({
        engagementId: engagement.id,
        data: {
          status: EngagementStatusUpdateStatus[pendingAction],
          effective_on: localIsoDate(),
        },
      });
    }
    setPendingAction(null);
  }

  const confirmation = pendingAction && CONFIRMATIONS[pendingAction];

  return (
    <BookRow
      title={book.title}
      author={authorNames(book)}
      cover={coverSrc(engagement)}
      details={
        // Its own line under the author rather than trailing the title: as a chip it no
        // longer sits on the title's baseline, and a multi-format read shows two.
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <FormatIcons formats={formats} />
        </div>
      }
      slots={[
        // Stacked, the bar spans both content columns -- the full width beside the cover,
        // so it can't be crushed into the ~60px the old shared line gave it. On one line
        // its track is `auto`, so it needs a width of its own.
        <ReadingProgress
          title={book.title}
          pct={completion_pct}
          className="col-span-2 @xl:col-span-1 @xl:w-40"
        />,
        <Button
          size="sm"
          className="col-span-2 @xl:col-span-1"
          aria-label={`Log progress for ${book.title}`}
          onClick={() => setLogOpen(true)}
        >
          Log progress
        </Button>,
      ]}
      menu={
        <>
          {/* A real link rather than a navigate() on click, so the read's page opens in a
              new tab on a modified click like any other. */}
          <DropdownMenuItem
            aria-label={`View history for ${book.title}`}
            render={<Link to={`/reads/${engagement.id}`} />}
          >
            <HugeiconsIcon icon={HistoryIcon} />
            View history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            aria-label={`Mark ${book.title} as finished`}
            onClick={() => setPendingAction('finished')}
          >
            <HugeiconsIcon icon={Tick02Icon} />
            Mark as finished
          </DropdownMenuItem>
          <DropdownMenuItem
            aria-label={`Mark ${book.title} as DNF`}
            onClick={() => setPendingAction('dnf')}
          >
            <HugeiconsIcon icon={Cancel02Icon} />
            Mark as DNF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            aria-label={`Delete ${book.title}`}
            onClick={() => setPendingAction('delete')}
          >
            <HugeiconsIcon icon={Delete02Icon} />
            Delete
          </DropdownMenuItem>
        </>
      }
    >
      <ProgressLogSheet engagement={engagement} open={logOpen} onOpenChange={setLogOpen} />

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={confirmation?.title(book.title)}
        description={confirmation?.description}
        confirmLabel={confirmation?.confirmLabel}
        tone={confirmation?.tone}
        onConfirm={handleConfirm}
      />
    </BookRow>
  );
}
