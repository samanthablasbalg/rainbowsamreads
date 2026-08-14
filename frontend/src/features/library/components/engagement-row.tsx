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
      to={`/books/${book.id}`}
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

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <FormatIcons formats={formats} />
          </div>
        </>
      }
      slots={[
        review?.rating ? (
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
