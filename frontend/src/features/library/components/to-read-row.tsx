import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsDeleteEngagement,
} from '@/api/generated/engagements/engagements';
import { type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { BookRow } from '@/components/common/book-row';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { FormatIcons } from '@/components/common/format-icons';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { authorNames, coverSrc } from '@/utils/book';
import { StartReadingSheet } from '@/components/common/start-reading-sheet';

export function ToReadRow({ engagement }: { engagement: EngagementRead }) {
  const { book, formats } = engagement;
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [startReadingOpen, setStartReadingOpen] = useState(false);

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
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <FormatIcons formats={formats} />
          </div>
        </>
      }
      slots={[
        <Button
          size="sm"
          className="col-span-2 @xl:col-span-1"
          aria-label={`Mark ${book.title} as reading`}
          onClick={() => setStartReadingOpen(true)}
        >
          <HugeiconsIcon icon={BookOpen01Icon} />
          Mark as reading
        </Button>,
      ]}
      menu={
        <DropdownMenuItem
          variant="destructive"
          aria-label={`Remove ${book.title} from To Read`}
          onClick={() => setConfirmOpen(true)}
        >
          <HugeiconsIcon icon={Delete02Icon} />
          Delete
        </DropdownMenuItem>
      }
    >
      <StartReadingSheet book={book} open={startReadingOpen} onOpenChange={setStartReadingOpen} />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Remove "${book.title}" from To Read?`}
        description="This removes the book from your To Read list. Any previous reads of this book will not be affected. This can't be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
      />
    </BookRow>
  );
}
