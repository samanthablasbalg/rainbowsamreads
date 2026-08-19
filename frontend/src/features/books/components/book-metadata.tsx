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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { localIsoDate } from '@/utils/local-date';
import { LogReadingSheet } from './log-reading-sheet';

// Labels every status a read can come back as. The menu offers only the subset the PATCH
// endpoint accepts, which is the narrower question -- hence a table here and a separate
// list below, rather than one doing both jobs.
const STATUS_LABELS: Record<ReadingStatus, string> = {
  interested: 'Interested',
  tbr: 'To read',
  reading: 'Reading',
  paused: 'Paused',
  finished: 'Finished',
  dnf: 'DNF',
};

// Same rule the search endpoint uses server-side (`_pick_status` in app/api/books.py): an
// active read wins regardless of recency, otherwise it's whichever engagement moved last.
// Null for a book nobody has opened, which is what makes the untracked card a state of
// this component rather than a separate one.
function currentEngagement(engagements: EngagementRead[]): EngagementRead | null {
  if (engagements.length === 0) {
    return null;
  }
  const reading = engagements.find((e) => e.status === ReadingStatus.reading);
  return (
    reading ?? engagements.reduce((latest, e) => (e.updated_at > latest.updated_at ? e : latest))
  );
}

// A book's rating is every read of it, averaged -- one read being the one-element case.
// Rounded to a quarter, the resolution the stars are drawn at, so the spoken label and
// the picture agree. Null when nothing has been rated.
function averageRating(engagements: EngagementRead[]): number | null {
  const ratings = engagements.flatMap((e) => (e.review?.rating ? [Number(e.review.rating)] : []));
  if (ratings.length === 0) {
    return null;
  }
  const mean = ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
  return Math.round(mean * 4) / 4;
}

// One card of labelled rows, holding what is known about this book beyond the book itself.
// It keeps its shape whether or not the book has been read, so nothing jumps when the
// first read is logged.
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
        // This card's own source, plus the shelves elsewhere that group by status.
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
                    updateStatus.mutate({
                      engagementId: current.id,
                      data: { status, effective_on: localIsoDate() },
                    })
                  }
                >
                  {STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="font-extrabold"
              onClick={() => setAddOpen(true)}
            >
              Not tracked
              <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
            </Button>
            <LogReadingSheet book={book} open={addOpen} onOpenChange={setAddOpen} />
          </>
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
