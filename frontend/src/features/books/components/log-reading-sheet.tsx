import { EngagementCreateStatus, type BookRead } from '@/api/generated/readingTracker.schemas';
import { FormatPickSheet } from '@/components/common/format-pick-sheet';

// The book page's two triggers -- the status pill on an untracked book, and "+ Log a
// reading" over the history -- open the same sheet with the same settings. Every status
// the endpoint will create, since this logs a read that may already be over, and no
// redirect: the new row belongs in the list the reader is already looking at.
export function LogReadingSheet({
  book,
  open,
  onOpenChange,
}: {
  book: BookRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <FormatPickSheet
      bookId={book.id}
      title={book.title}
      audioMinutes={book.default_audio_minutes}
      statuses={Object.values(EngagementCreateStatus)}
      redirectOnCreate={false}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
