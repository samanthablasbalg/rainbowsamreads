import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import {
  EngagementCreateStatus,
  EngagementStatusUpdateStatus,
  ReadingStatus,
  type BookRead,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import {
  getEngagementsListBookEngagementsQueryKey,
  getEngagementsListEngagementsQueryKey,
  useEngagementsUpdateEngagementStatus,
} from '@/api/generated/engagements/engagements';
import { FormatPickSheet } from '@/components/common/format-pick-sheet';
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
// `engagements` is never empty here -- callers only reach this once `tracked` is true.
function currentEngagement(engagements: EngagementRead[]): EngagementRead {
  const reading = engagements.find((e) => e.status === ReadingStatus.reading);
  return (
    reading ?? engagements.reduce((latest, e) => (e.updated_at > latest.updated_at ? e : latest))
  );
}

// One card of labelled rows, holding what is known about this book beyond the book itself.
// It keeps its shape whether or not the book has been read, so nothing jumps when the
// first read is logged.
export function BookMetadata({
  book,
  tracked,
  engagements,
}: {
  book: BookRead;
  tracked: boolean;
  engagements: EngagementRead[];
}) {
  const latestRated = engagements.find((e) => e.review?.rating);
  const current = tracked ? currentEngagement(engagements) : null;
  const [addOpen, setAddOpen] = useState(false);

  const queryClient = useQueryClient();
  const updateStatus = useEngagementsUpdateEngagementStatus({
    mutation: {
      onSuccess: () => {
        // This card's own source, plus the shelves elsewhere that group by status.
        queryClient.invalidateQueries({
          queryKey: getEngagementsListBookEngagementsQueryKey(book.id),
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
            <FormatPickSheet
              bookId={book.id}
              title={book.title}
              audioMinutes={book.default_audio_minutes}
              statuses={Object.values(EngagementCreateStatus)}
              redirectOnCreate={false}
              open={addOpen}
              onOpenChange={setAddOpen}
            />
          </>
        )}
      </Row>

      <Row label="Rating">
        {latestRated?.review?.rating ? (
          <>
            <StarRating rating={latestRated.review.rating} />
            <span className="text-xs font-bold whitespace-nowrap text-muted-foreground">
              latest of {engagements.length}
            </span>
          </>
        ) : (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {tracked ? 'not rated yet' : 'after a read'}
          </span>
        )}
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
