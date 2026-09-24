import { ReadingStatus, type BookRead } from '@/api/generated/readingTracker.schemas';
import { StartReadingSheet } from '@/components/common/start-reading-sheet';

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
    <StartReadingSheet
      book={book}
      statuses={[ReadingStatus.reading, ReadingStatus.finished, ReadingStatus.dnf]}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
