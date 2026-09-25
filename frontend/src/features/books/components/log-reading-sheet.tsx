import type { BookRead } from '@/api/generated/readingTracker.schemas';
import { StartReadingSheet } from '@/components/common/start-reading-sheet';
import { SHELVED_STATUSES } from '@/utils/status';

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
      statuses={SHELVED_STATUSES}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
