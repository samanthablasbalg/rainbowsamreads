import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { getBooksListBooksQueryKey, useBooksDeleteBook } from '@/api/generated/books/books';
import type { BookRead } from '@/api/generated/readingTracker.schemas';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { BookRow } from '@/components/common/book-row';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ErrorText } from '@/components/common/error-text';
import { FormatPickSheet } from '@/components/common/format-pick-sheet';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { authorNames } from '@/utils/book';

function formatAudioLength(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(' ');
}

function formatLengths({ default_page_count, default_audio_minutes }: BookRead): string | null {
  const lengths = [
    default_page_count && `${default_page_count} ${default_page_count === 1 ? 'page' : 'pages'}`,
    default_audio_minutes && formatAudioLength(default_audio_minutes),
  ].filter(Boolean);

  return lengths.length > 0 ? lengths.join(' · ') : null;
}

export function CatalogRow({ book }: { book: BookRead }) {
  const lengths = formatLengths(book);
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);

  const deleteBook = useBooksDeleteBook<DetailError>({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getBooksListBooksQueryKey() }),
    },
  });

  function handleDelete() {
    setConfirmOpen(false);
    deleteBook.mutate({ bookId: book.id });
  }

  return (
    <BookRow
      title={book.title}
      author={authorNames(book)}
      cover={book.default_cover_url}
      details={
        <>
          {lengths && <p className="text-sm text-muted-foreground">{lengths}</p>}

          {deleteBook.isError && (
            <ErrorText>
              {errorDetail(deleteBook.error, "Couldn't delete this book. Please try again.")}
            </ErrorText>
          )}
        </>
      }
      slots={[
        <Button
          size="sm"
          className="col-span-2 @xl:col-span-1"
          aria-label={`Mark ${book.title} as reading`}
          onClick={() => setPickOpen(true)}
        >
          <HugeiconsIcon icon={BookOpen01Icon} />
          Mark as reading
        </Button>,
      ]}
      menu={
        <DropdownMenuItem
          variant="destructive"
          aria-label={`Delete ${book.title}`}
          onClick={() => setConfirmOpen(true)}
        >
          <HugeiconsIcon icon={Delete02Icon} />
          Delete
        </DropdownMenuItem>
      }
    >
      <FormatPickSheet
        bookId={book.id}
        title={book.title}
        audioMinutes={book.default_audio_minutes}
        open={pickOpen}
        onOpenChange={setPickOpen}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete "${book.title}"?`}
        description="The catalog is shared, so this removes the book for everyone. It can't be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
      />
    </BookRow>
  );
}
