import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { getBooksListBooksQueryKey, useBooksDeleteBook } from '@/api/generated/books/books';
import type { BookRead, CatalogEngagementRead } from '@/api/generated/readingTracker.schemas';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { BookRow } from '@/components/common/book-row';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ErrorText } from '@/components/common/error-text';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { authorNames, formatAudioLength, formatPageCount } from '@/utils/book';
import { StatusDropdown } from '@/components/common/status-dropdown';

function formatLengths({ default_page_count, default_audio_minutes }: BookRead): string | null {
  const lengths = [
    default_page_count && formatPageCount(default_page_count),
    default_audio_minutes && formatAudioLength(default_audio_minutes),
  ].filter(Boolean);

  return lengths.length > 0 ? lengths.join(' · ') : null;
}

export function CatalogRow({
  book,
  engagement,
}: {
  book: BookRead;
  engagement: CatalogEngagementRead | null;
}) {
  const lengths = formatLengths(book);
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

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
      to={`/books/${book.id}`}
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
      slots={[<StatusDropdown book={book} engagement={engagement} />]}
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
