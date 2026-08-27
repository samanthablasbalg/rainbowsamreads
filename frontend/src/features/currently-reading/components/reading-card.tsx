import { useState } from 'react';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel02Icon,
  Delete02Icon,
  HistoryIcon,
  PlusSignIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsDeleteEngagement,
  useEngagementsUpdateEngagementStatus,
} from '@/api/generated/engagements/engagements';
import {
  EngagementStatusUpdateStatus,
  Format,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { BookRow } from '@/components/common/book-row';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormatIcons } from '@/components/common/format-icons';
import { ReadingProgress } from '@/components/common/reading-progress';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { authorNames, coverSrc } from '@/utils/book';
import { statusUpdateBody } from '@/utils/status';
import { ProgressLogSheet } from '@/components/common/progress-log-sheet';
import { AddFormatSheet } from './add-format-sheet';
import { FinishReadSheet } from './finish-read-sheet';

const CONFIRMATIONS = {
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

export function ReadingCard({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, completion_pct } = engagement;
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [addFormatOpen, setAddFormatOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
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
      updateStatus.mutate({
        engagementId: engagement.id,
        data: statusUpdateBody(EngagementStatusUpdateStatus[pendingAction]),
      });
    }
    setPendingAction(null);
  }

  const confirmation = pendingAction && CONFIRMATIONS[pendingAction];

  return (
    <BookRow
      title={book.title}
      to={`/books/${book.id}`}
      author={authorNames(book)}
      cover={coverSrc(engagement)}
      details={
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <FormatIcons formats={formats} />
        </div>
      }
      slots={[
        // On one line the grid track is `auto`, so the bar needs a width of its own.
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
          <DropdownMenuItem
            aria-label={`View history for ${book.title}`}
            render={<Link to={`/reads/${engagement.id}`} />}
          >
            <HugeiconsIcon icon={HistoryIcon} />
            View history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {formats.length < Object.keys(Format).length && (
            <>
              <DropdownMenuItem
                aria-label={`Add another format to ${book.title}`}
                onClick={() => setAddFormatOpen(true)}
              >
                <HugeiconsIcon icon={PlusSignIcon} />
                Add another format
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            aria-label={`Mark ${book.title} as finished`}
            onClick={() => setFinishOpen(true)}
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

      <AddFormatSheet
        engagement={engagement}
        open={addFormatOpen}
        onOpenChange={setAddFormatOpen}
      />

      <FinishReadSheet engagement={engagement} open={finishOpen} onOpenChange={setFinishOpen} />

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
