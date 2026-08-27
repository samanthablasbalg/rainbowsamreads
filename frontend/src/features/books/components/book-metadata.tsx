import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import {
  EngagementStatusUpdateStatus,
  ReadingStatus,
  type BookRead,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { getBooksListBookEngagementsQueryKey } from '@/api/generated/books/books';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsUpdateEngagementStatus,
} from '@/api/generated/engagements/engagements';
import { StarRating } from '@/components/common/star-rating';
import { StartReadingSheet } from '@/components/common/start-reading-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { statusUpdateBody } from '@/utils/status';
import { LogReadingSheet } from './log-reading-sheet';

const STATUS_LABELS: Record<ReadingStatus, string> = {
  interested: 'Interested',
  tbr: 'To read',
  reading: 'Reading',
  paused: 'Paused',
  finished: 'Finished',
  dnf: 'DNF',
};

// Finished and DNF are endings. Picking Reading again is another time through the book,
// not a correction to the last one, so it starts a new engagement through the sheet
// instead of reopening the one that already ended.
const ENDED: ReadingStatus[] = [ReadingStatus.finished, ReadingStatus.dnf];

function currentEngagement(engagements: EngagementRead[]): EngagementRead | null {
  if (engagements.length === 0) {
    return null;
  }
  const reading = engagements.find((e) => e.status === ReadingStatus.reading);
  return (
    reading ?? engagements.reduce((latest, e) => (e.updated_at > latest.updated_at ? e : latest))
  );
}

function averageRating(engagements: EngagementRead[]): number | null {
  const ratings = engagements.flatMap((e) => (e.review?.rating ? [Number(e.review.rating)] : []));
  if (ratings.length === 0) {
    return null;
  }
  const mean = ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
  return Math.round(mean * 4) / 4;
}

export function BookMetadata({
  book,
  engagements,
}: {
  book: BookRead;
  engagements: EngagementRead[];
}) {
  const current = currentEngagement(engagements);
  const [addOpen, setAddOpen] = useState(false);

  const queryClient = useQueryClient();
  const updateStatus = useEngagementsUpdateEngagementStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getBooksListBookEngagementsQueryKey(book.id),
        });
        queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() });
      },
    },
  });

  return (
    <Card className="gap-0 divide-y divide-accent py-0">
      <Row label="Status">
        {current ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="secondary"
                  size="sm"
                  className="font-extrabold"
                  aria-label={`Status: ${STATUS_LABELS[current.status]}`}
                  disabled={updateStatus.isPending}
                >
                  {STATUS_LABELS[current.status]}
                  <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
                </Button>
              }
            />
            <DropdownMenuContent>
              {Object.values(EngagementStatusUpdateStatus).map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() =>
                    status === EngagementStatusUpdateStatus.reading &&
                    ENDED.includes(current.status)
                      ? setAddOpen(true)
                      : updateStatus.mutate({
                          engagementId: current.id,
                          data: statusUpdateBody(status),
                        })
                  }
                >
                  {STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="font-extrabold"
            onClick={() => setAddOpen(true)}
          >
            Not tracked
            <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
          </Button>
        )}

        {current ? (
          <StartReadingSheet book={book} open={addOpen} onOpenChange={setAddOpen} />
        ) : (
          <LogReadingSheet book={book} open={addOpen} onOpenChange={setAddOpen} />
        )}
      </Row>

      <Row label="Rating">
        <StarRating rating={averageRating(engagements)} />
      </Row>

      {/* Ownership, recommender and acquisition have no store behind them yet. The rows
          hold their place in the card rather than inventing a reading they cannot back. */}
      <Row label="Owned">
        <ComingSoon />
      </Row>

      <Row label="Rec. by">
        <ComingSoon />
      </Row>

      <Row label="Source">
        <ComingSoon />
      </Row>

      {/* The page's only route into editions. Everything about a book's editions lives
          there, which is what keeps this card about this reader's copy instead. */}
      <Button
        variant="ghost"
        className="h-12 justify-between rounded-none px-4 font-bold text-ring"
      >
        Editions & copies
        <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
      </Button>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
      <span className="w-18 shrink-0 text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">{children}</div>
    </div>
  );
}

function ComingSoon() {
  return <span className="font-serif text-sm text-muted-foreground italic">Coming soon</span>;
}
