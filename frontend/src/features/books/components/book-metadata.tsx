import { useState, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, DeleteIcon } from '@hugeicons/core-free-icons';
import { type BookRead, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { StarRating } from '@/components/common/star-rating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusDropdown } from '@/components/common/status-dropdown';
import { isOpenStatus } from '@/utils/status';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import {
  getRecommendersListRecommendersQueryKey,
  useRecommendersListRecommendersSuspense,
} from '@/api/generated/recommenders/recommenders';
import {
  getBooksListBookRecommendationsQueryKey,
  useBooksAddRecommender,
  useBooksDeleteRecommendation,
  useBooksListBookRecommendationsSuspense,
} from '@/api/generated';
import { useQueryClient } from '@tanstack/react-query';

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
  const [inputValue, setInputValue] = useState('');
  const name = inputValue.trim();
  const { data: recommenders } = useRecommendersListRecommendersSuspense();
  const recommenderNames = recommenders
    .map((recommender) => recommender.name)
    .toSorted((a, b) => a.localeCompare(b));

  const { data: recommendations } = useBooksListBookRecommendationsSuspense(book.id);
  const recommendation = recommendations[0] ?? null;

  const queryClient = useQueryClient();

  function addRecommender(name: string) {
    addRecommenderMutation.mutate({
      bookId: book.id,
      data: { name },
    });
  }

  const addRecommenderMutation = useBooksAddRecommender({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getBooksListBookRecommendationsQueryKey(book.id),
        });

        await queryClient.invalidateQueries({
          queryKey: getRecommendersListRecommendersQueryKey(),
        });

        setInputValue('');
      },
    },
  });

  const deleteRecommendationMutation = useBooksDeleteRecommendation({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getBooksListBookRecommendationsQueryKey(book.id),
        }),
    },
  });

  return (
    <Card className="gap-0 divide-y divide-accent py-0">
      <Row label="Status">
        <StatusDropdown book={book} engagement={currentEngagement(engagements)} />
      </Row>

      <Row label="Rating">
        <StarRating rating={averageRating(engagements)} />
      </Row>

      {/* Ownership and acquisition have no store behind them yet. The rows
          hold their place in the card rather than inventing a reading they cannot back. */}
      <Row label="Owned">
        <ComingSoon />
      </Row>

      <Row label="Rec. by">
        {recommendation ? (
          <>
            <span>{recommendation.recommender.name}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove recommendation by ${recommendation.recommender.name}`}
              onClick={() =>
                deleteRecommendationMutation.mutate({
                  bookId: book.id,
                  recommenderId: recommendation.recommender.id,
                })
              }
            >
              <HugeiconsIcon icon={DeleteIcon} />
            </Button>
          </>
        ) : (
          <Combobox<string>
            items={recommenderNames}
            inputValue={inputValue}
            onInputValueChange={setInputValue}
            onValueChange={(selectedName) => {
              if (selectedName !== null) {
                addRecommender(selectedName);
              }
            }}
          >
            <ComboboxInput placeholder="Add..." />
            <ComboboxContent>
              <ComboboxEmpty>
                {name ? (
                  <Button onClick={() => addRecommender(name)}>Add “{name}”</Button>
                ) : (
                  'Type a name'
                )}
              </ComboboxEmpty>
              <ComboboxList>
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        )}
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
