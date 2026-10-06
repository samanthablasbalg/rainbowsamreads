import { type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { type BookRead, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { StarRating } from '@/components/common/star-rating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusDropdown } from '@/components/common/status-dropdown';
import { isOpenStatus } from '@/utils/status';

function averageRating(engagements: EngagementRead[]): number | null {
  const ratings = engagements.flatMap((e) => (e.review?.rating ? [Number(e.review.rating)] : []));
  if (ratings.length === 0) {
    return null;
  }
  const mean = ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
  return Math.round(mean * 4) / 4;
}

function currentEngagement(engagements: EngagementRead[]): EngagementRead | null {
  if (engagements.length === 0) {
    return null;
  }
  const open = engagements.find((engagement) => isOpenStatus(engagement.status));
  return open ?? engagements.reduce((latest, e) => (e.updated_at > latest.updated_at ? e : latest));
}

export function BookMetadata({
  book,
  engagements,
}: {
  book: BookRead;
  engagements: EngagementRead[];
}) {
  return (
    <Card className="gap-0 divide-y divide-accent py-0">
      <Row label="Status">
        <StatusDropdown book={book} engagement={currentEngagement(engagements)} />
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
