import { useState } from 'react';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, HistoryIcon, MoreVerticalIcon, StarIcon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEngagementsDeleteEngagement } from '@/api/generated/engagements/engagements';
import { ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { CoverImage } from '@/components/common/cover-image';
import { FormatIcons } from '@/components/common/format-icons';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const { book, formats, cover_url, status, finished_on, abandoned_on, completion_pct, review } =
    engagement;
  const isDnf = status === ReadingStatus.dnf;
  const endedOn = isDnf ? abandoned_on : finished_on;
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const deleteEngagement = useEngagementsDeleteEngagement({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/engagements'] }),
    },
  });

  function handleDelete() {
    setConfirmOpen(false);
    deleteEngagement.mutate({ engagementId: engagement.id });
  }

  return (
    <li aria-label={book.title}>
      {/* Same grid as ReadingCard, four columns rather than five -- the middle slot there
          is the progress bar, which this row deliberately does not have (see above). One
          container query decides stacked vs one line. */}
      <Card
        size="sm"
        className="@container grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 px-(--card-spacing) @xl:grid-cols-[auto_1fr_auto_auto]"
      >
        {/* Wrapped because Card treats a bare `img` first child as a full-bleed hero and
            drops its top padding -- and CoverImage renders a bare `img` whenever a cover
            loads, so without this the row's padding depends on whether the image arrived. */}
        <div className="row-span-2 @xl:row-span-1">
          <CoverImage src={cover_url ?? book.default_cover_url} title={book.title} />
        </div>

        {/* The 1fr track. Format chips moved off the title's line onto their own, matching
            ReadingCard: as chips they no longer sit on the title's baseline, and a
            multi-format read shows two. */}
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="leading-tight">{book.title}</CardTitle>

          <p className="text-sm text-muted-foreground">
            {book.authors.map((author) => author.name).join(', ')}
          </p>

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
        </div>

        {review?.rating ? (
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
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="col-start-3 row-start-1 self-start @xl:col-start-4 @xl:self-center"
                aria-label={`More actions for ${book.title}`}
              >
                <HugeiconsIcon icon={MoreVerticalIcon} />
              </Button>
            }
          />
          <DropdownMenuContent>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>

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
    </li>
  );
}
