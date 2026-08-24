import { EngagementCreateStatus, type BookRead } from '@/api/generated/readingTracker.schemas';
import { FormatPickSheet } from '@/components/common/format-pick-sheet';

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
