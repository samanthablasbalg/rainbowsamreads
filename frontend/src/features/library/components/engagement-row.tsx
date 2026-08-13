import { useState } from 'react';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, HistoryIcon, StarIcon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsDeleteEngagement,
} from '@/api/generated/engagements/engagements';
import { ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { BookRow } from '@/components/common/book-row';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormatIcons } from '@/components/common/format-icons';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { authorNames, coverSrc } from '@/utils/book';
import { formatIsoDate } from '@/utils/format-date';
import { ReviewSheet } from './review-sheet';
import { StarRating } from './star-rating';

// One row for both the finished and DNF shelves. They differ in two details, not in
// structure, so this is a branch rather than a second component: which date is shown,
// and whether the point it was abandoned at is.
//
// `completion_pct` is text rather than the ReadingProgress bar deliberately -- a bar
// reads as a read still in motion, which is the one thing a DNF is not.
//
// The rating shows on the card but the review body does not: the body is long-form and
// belongs to the sheet that wrote it, and a shelf of them would stop being a shelf.
// Delete removes this read, not the book: the title stays in the catalog afterwards.
export function EngagementRow({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, status, finished_on, abandoned_on, completion_pct, review } = engagement;
  const isDnf = status === ReadingStatus.dnf;
  const endedOn = isDnf ? abandoned_on : finished_on;
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const deleteEngagement = useEngagementsDeleteEngagement({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() }),
    },
  });

  function handleDelete() {
    setConfirmOpen(false);
    deleteEngagement.mutate({ engagementId: engagement.id });
  }

  return (
    <BookRow
      title={book.title}
      author={authorNames(book)}
      cover={coverSrc(engagement)}
      details={
        <>
          {endedOn && (
            <p className="text-sm text-muted-foreground">
              {isDnf ? 'Abandoned' : 'Finished'} {formatIsoDate(endedOn)}
            </p>
          )}

          {isDnf && completion_pct !== null && (
            <p className="text-sm text-muted-foreground">Stopped at {completion_pct}%</p>
          )}

          {/* Format chips on their own line rather than the title's, matching ReadingCard:
              as chips they no longer sit on the title's baseline, and a multi-format read
              shows two. */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <FormatIcons formats={formats} />
          </div>
        </>
      }
      slots={[
        review?.rating ? (
          // Wrapped rather than given the span directly: StarRating takes no className,
          // and stretching it would say nothing -- the stars stay at their own width.
          <div className="col-span-2 @xl:col-span-1">
            <StarRating rating={review.rating} />
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="col-span-2 @xl:col-span-1"
            aria-label={`Add a rating for ${book.title}`}
            onClick={() => setReviewOpen(true)}
          >
            <HugeiconsIcon icon={StarIcon} />
            Add rating
          </Button>
        ),
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
          <DropdownMenuItem
            aria-label={`Rate and review ${book.title}`}
            onClick={() => setReviewOpen(true)}
          >
            <HugeiconsIcon icon={StarIcon} />
            {review?.rating ? 'Edit rating & review' : 'Add rating & review'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            aria-label={`Delete ${book.title}`}
            onClick={() => setConfirmOpen(true)}
          >
            <HugeiconsIcon icon={Delete02Icon} />
            Delete
          </DropdownMenuItem>
        </>
      }
    >
      <ReviewSheet engagement={engagement} open={reviewOpen} onOpenChange={setReviewOpen} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete this read of "${book.title}"?`}
        description="This removes the read, its progress logs and its review. The book stays in the catalog. This can't be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
      />
    </BookRow>
  );
}
