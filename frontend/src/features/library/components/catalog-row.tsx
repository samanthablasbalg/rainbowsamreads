import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon, Delete02Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useBooksDeleteBook } from '@/api/generated/books/books';
import type { BookRead } from '@/api/generated/readingTracker.schemas';
import type { ErrorType } from '@/api/mutator/axios-instance';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { CoverImage } from '@/components/common/cover-image';
import { FormatPickSheet } from '@/components/common/format-pick-sheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// "8h 32m", dropping either half when it is zero -- 90 reads as "1h 30m", 45 as "45m",
// 120 as "2h". Deliberately not `formatMinutesAsHhmm`, which renders "01:30": that is a
// clock position, the right shape for where you are in an audiobook and the wrong one
// for how long the whole thing is.
function formatAudioLength(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return [hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(' ');
}

// A book can have a page count, an audio length, both, or neither -- these are the
// defaults on the book itself, not on an edition someone owns.
function formatLengths({ default_page_count, default_audio_minutes }: BookRead): string | null {
  const lengths = [
    default_page_count && `${default_page_count} ${default_page_count === 1 ? 'page' : 'pages'}`,
    default_audio_minutes && formatAudioLength(default_audio_minutes),
  ].filter(Boolean);

  return lengths.length > 0 ? lengths.join(' · ') : null;
}

// The catalog's row: every book known to the app, whether or not it has ever been read.
// Same cover-led shape as ReadingCard, but off `BookRead` rather than an engagement --
// there is no progress, no format and no status here, because none of those exist until
// a book is picked up.
//
// "Mark as reading" opens the format picker rather than starting a read directly: an
// engagement binds to an edition, and the format is what picks which one.
//
// Deleting a book is not deleting a read, and `books` carries no user_id -- it is one
// shared table, so this removes the title for every user, not from a personal shelf.
// The backend refuses with a 409 while any engagement or standalone entry still points
// at it, anyone's included, which is the ordinary outcome from this screen rather than
// an edge case -- so the failure is rendered on the row instead of being swallowed.
export function CatalogRow({ book }: { book: BookRead }) {
  const lengths = formatLengths(book);
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);

  const deleteBook = useBooksDeleteBook<ErrorType<{ detail?: string }>>({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/books'] }),
    },
  });

  function handleDelete() {
    setConfirmOpen(false);
    deleteBook.mutate({ bookId: book.id });
  }

  return (
    <li aria-label={book.title}>
      <Card size="sm" className="flex-row items-start gap-3">
        <CoverImage src={book.default_cover_url} title={book.title} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-medium leading-tight">{book.title}</span>

          <p className="truncate text-sm text-muted-foreground">
            {book.authors.map((author) => author.name).join(', ')}
          </p>

          {lengths && <p className="text-sm text-muted-foreground">{lengths}</p>}

          {deleteBook.isError && (
            <p role="alert" className="text-sm text-destructive">
              {deleteBook.error.response?.data?.detail ??
                "Couldn't delete this book. Please try again."}
            </p>
          )}

          <div className="mt-auto flex items-center gap-2 pt-1">
            <Button
              size="sm"
              aria-label={`Mark ${book.title} as reading`}
              onClick={() => setPickOpen(true)}
            >
              <HugeiconsIcon icon={BookOpen01Icon} />
              Mark as reading
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`More actions for ${book.title}`}
                  >
                    <HugeiconsIcon icon={MoreVerticalIcon} />
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuItem
                  variant="destructive"
                  aria-label={`Delete ${book.title}`}
                  onClick={() => setConfirmOpen(true)}
                >
                  <HugeiconsIcon icon={Delete02Icon} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

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
    </li>
  );
}
