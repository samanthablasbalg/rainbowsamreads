import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorType } from '@/api/mutator/axios-instance';
import { useEngagementsUpsertReview } from '@/api/generated/engagements/engagements';
import type { EngagementRead } from '@/api/generated/readingTracker.schemas';
import { ButtonLabel } from '@/components/common/button-label';
import { CoverImage } from '@/components/common/cover-image';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { StarRatingInput } from './star-rating-input';

type ReviewSheetProps = {
  engagement: EngagementRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Rate and review a finished or abandoned read. Both entry points on EngagementRow -- the
// Add rating button and the dropdown item -- open this same overlay, so there is one form
// rather than one per trigger.
//
// The split between this and ReviewForm is the same one ProgressLogSheet documents:
// everything below ResponsiveDialogContent lives inside Base UI's portal, which tears its
// subtree down on close. The form's state has to live there so reopening re-seeds it from
// whatever the row now holds, instead of showing the values from the last time it opened.
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
          <CoverImage
            src={engagement.cover_url ?? engagement.book.default_cover_url}
            title={title}
            className="h-16 w-11"
          />
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        </div>
      </ResponsiveDialogHeader>

      {/* The fields scroll, the header and footer do not, so Save stays reachable however
          long the review is. Both branches need this and for different reasons:
          DialogContent sets no max height at all, so a tall body grows the popup past the
          viewport and centring carries the footer off the bottom of the screen;
          DrawerContent is capped but clips, so the text would be cut off with no way to
          reach the rest. min-h-0 is what lets a flex child shrink below its content --
          without it the drawer's column refuses to compress and nothing scrolls. flex-1
          does the work in the drawer, max-h in the dialog's grid, and each is inert in the
          other. */}
      <div className="max-h-[60dvh] min-h-0 flex-1 overflow-y-auto">
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
                  // Focused only when the Edit button is what mounted this, which is
                  // exactly when the sheet opened onto existing text. Autofocusing the
                  // empty case too would raise a keyboard over the drawer on touch before
                  // the rating has been looked at, let alone set.
                  autoFocus={form.startedWithBody}
                  onChange={(event) => form.setBody(event.target.value)}
                />
              </>
            ) : (
              <>
                {/* FieldTitle rather than FieldLabel: there is no control to point `htmlFor`
                  at while the text is static, and a label whose target does not exist is
                  worse than a heading. */}
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
                {/* A filled panel rather than an outlined one: in this app a border is the
                  input signal -- Input and Textarea both draw one -- so anything bordered
                  reads as typeable however it is filled. whitespace-pre-wrap so the
                  paragraphs the review was written with survive. */}
                <p className="rounded-xl bg-muted p-3 text-base whitespace-pre-wrap md:text-sm">
                  {form.body}
                </p>
              </>
            )}
          </Field>
        </FieldGroup>
      </div>

      {form.error && <p role="alert">{form.error}</p>}

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
  // `rating` arrives as a string because JSON has no decimal type, and null when the read
  // has no review yet or a body without a score. Both become 0, the input's empty end.
  const [rating, setRating] = useState(() => Number(engagement.review?.rating ?? 0));
  const [body, setBody] = useState(() => engagement.review?.body ?? '');
  const [error, setError] = useState<string | null>(null);

  // Text that already exists opens as a static block with an Edit button rather than a
  // textarea, so a finished review reads as a thing you wrote instead of a form waiting
  // on you. A read with a rating but no body has nothing to show statically, so it opens
  // straight into the editor. This is only ever entered, never left -- Cancel or a close
  // is the way back, and both unmount the form and re-seed it from the review.
  const [startedWithBody] = useState(() => (engagement.review?.body ?? '') !== '');
  const [editingBody, setEditingBody] = useState(!startedWithBody);

  const queryClient = useQueryClient();

  const upsertReview = useEngagementsUpsertReview<ErrorType<{ detail?: string }>>({
    mutation: {
      // Invalidate rather than patch, matching the delete handler on EngagementRow. These
      // shelves are ordered by finished_on / abandoned_on, which a review does not touch,
      // so a refetch cannot reshuffle the list under the user the way it would on the
      // reading shelf.
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
        onClose();
      },
      onError: (err) => {
        setError(err.response?.data?.detail ?? 'Failed to save. Please try again.');
      },
    },
  });

  function handleSave() {
    setError(null);
    upsertReview.mutate({
      engagementId: engagement.id,
      data: {
        // The API takes 1.00-5.00 or null; the input's 0 is how you get back to null.
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
