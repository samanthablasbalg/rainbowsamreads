import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { errorDetail, type DetailError } from '@/api/error-detail';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsUpsertReview,
} from '@/api/generated/engagements/engagements';
import type { EngagementRead } from '@/api/generated/readingTracker.schemas';
import { ButtonLabel } from '@/components/common/button-label';
import { CoverImage } from '@/components/common/cover-image';
import { ErrorText } from '@/components/common/error-text';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { coverSrc } from '@/utils/book';
import { StarRatingInput } from './star-rating-input';

type ReviewSheetProps = {
  engagement: EngagementRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReviewSheet({ engagement, open, onOpenChange }: ReviewSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ReviewForm engagement={engagement} onDone={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function ReviewForm({ engagement, onDone }: { engagement: EngagementRead; onDone: () => void }) {
  const title = engagement.book.title;
  const form = useReviewForm(engagement, onDone);

  return (
    <>
      <ResponsiveDialogHeader>
        <div className="flex items-center gap-3">
          <CoverImage src={coverSrc(engagement)} title={title} className="h-16 w-11" />
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        </div>
      </ResponsiveDialogHeader>

      <ResponsiveDialogBody>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="review-rating">Rating</FieldLabel>
            <StarRatingInput
              id="review-rating"
              value={form.rating}
              onChange={form.setRating}
              disabled={form.savePending}
            />
            <FieldDescription>
              {form.rating === 0 ? 'No rating' : `${form.rating} out of 5`}
            </FieldDescription>
          </Field>

          <Field>
            {form.editingBody ? (
              <>
                <FieldLabel htmlFor="review-body">Review</FieldLabel>
                <Textarea
                  id="review-body"
                  placeholder="What did you think?"
                  value={form.body}
                  disabled={form.savePending}
                  // Only when Edit mounted this. Autofocusing the empty case would raise a
                  // keyboard over the drawer on touch before the rating has been set.
                  autoFocus={form.startedWithBody}
                  onChange={(event) => form.setBody(event.target.value)}
                />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <FieldTitle>Review</FieldTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={form.savePending}
                    aria-label={`Edit review for ${title}`}
                    onClick={form.editBody}
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} data-icon="inline-start" />
                    Edit
                  </Button>
                </div>
                <p className="rounded-xl bg-muted p-3 text-base whitespace-pre-wrap md:text-sm">
                  {form.body}
                </p>
              </>
            )}
          </Field>
        </FieldGroup>

        {form.error && <ErrorText>{form.error}</ErrorText>}
      </ResponsiveDialogBody>

      <ResponsiveDialogFooter>
        <Button variant="outline" disabled={form.savePending} onClick={onDone}>
          Cancel
        </Button>
        <Button
          onClick={form.handleSave}
          disabled={form.savePending}
          aria-label={`Save review for ${title}`}
        >
          <ButtonLabel pending={form.savePending} pendingLabel="Saving…">
            Save
          </ButtonLabel>
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

function useReviewForm(engagement: EngagementRead, onClose: () => void) {
  const [rating, setRating] = useState(() => Number(engagement.review?.rating ?? 0));
  const [body, setBody] = useState(() => engagement.review?.body ?? '');
  const [error, setError] = useState<string | null>(null);

  const [startedWithBody] = useState(() => (engagement.review?.body ?? '') !== '');
  const [editingBody, setEditingBody] = useState(!startedWithBody);

  const queryClient = useQueryClient();

  const upsertReview = useEngagementsUpsertReview<DetailError>({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() });
        onClose();
      },
      onError: (err) => {
        setError(errorDetail(err, 'Failed to save. Please try again.'));
      },
    },
  });

  function handleSave() {
    setError(null);
    upsertReview.mutate({
      engagementId: engagement.id,
      data: {
        rating: rating === 0 ? null : rating,
        body: body.trim() === '' ? null : body.trim(),
      },
    });
  }

  return {
    rating,
    setRating,
    body,
    setBody,
    startedWithBody,
    editingBody,
    editBody: () => setEditingBody(true),
    handleSave,
    error,
    savePending: upsertReview.isPending,
  };
}
