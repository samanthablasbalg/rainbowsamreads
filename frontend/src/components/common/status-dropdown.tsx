import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { StartReadingSheet } from '@/components/common/start-reading-sheet';
import { FinishReadSheet } from '@/components/common/finish-read-sheet';
import {
  ReadingStatus,
  type BookRead,
  type CatalogEngagementRead,
  type CreatableReadingStatus,
} from '@/api/generated/readingTracker.schemas';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsWriteEngagement,
} from '@/api/generated/engagements/engagements';
import {
  getBooksListBookEngagementsQueryKey,
  getBooksListBooksQueryKey,
} from '@/api/generated/books/books';
import { CREATABLE_STATUSES, isEndedStatus, statusUpdateBody } from '@/utils/status';

const STATUS_LABELS: Record<ReadingStatus, string> = {
  tbr: 'To read',
  reading: 'Reading',
  paused: 'Paused',
  finished: 'Finished',
  dnf: 'DNF',
};

export function StatusDropdown({
  book,
  engagement,
}: {
  book: BookRead;
  engagement: CatalogEngagementRead | null;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [picked, setPicked] = useState<CreatableReadingStatus>(ReadingStatus.reading);

  const queryClient = useQueryClient();
  const updateStatus = useEngagementsWriteEngagement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getBooksListBookEngagementsQueryKey(book.id),
        });
        queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getBooksListBooksQueryKey() });
      },
    },
  });

  const label = engagement ? STATUS_LABELS[engagement.status] : 'Not tracked';

  function pick(status: CreatableReadingStatus) {
    if (engagement?.status === status) return;
    // Picking a status after an ending starts another time through the book rather
    // than reopening the engagement that already ended.
    const startsNewRead = !engagement || isEndedStatus(engagement.status);
    const promotesTbr =
      engagement?.status === ReadingStatus.tbr && status === ReadingStatus.reading;

    if (startsNewRead && status === ReadingStatus.tbr) {
      updateStatus.mutate({ data: { book_id: book.id, status } });
    } else if (startsNewRead || promotesTbr) {
      setPicked(status);
      setAddOpen(true);
    } else if (status === ReadingStatus.finished) {
      setFinishOpen(true);
    } else {
      updateStatus.mutate({ data: { id: engagement?.id, ...statusUpdateBody(status) } });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="secondary"
              size="sm"
              className="font-extrabold"
              aria-label={`Status: ${label}`}
              disabled={updateStatus.isPending}
            >
              {label}
              <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
            </Button>
          }
        />

        <DropdownMenuContent>
          {CREATABLE_STATUSES.map((status) => (
            <DropdownMenuItem key={status} onClick={() => pick(status)}>
              {STATUS_LABELS[status]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <StartReadingSheet
        book={book}
        engagementId={engagement?.status === ReadingStatus.tbr ? engagement.id : undefined}
        statuses={[picked]}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      {engagement && (
        <FinishReadSheet
          book={book}
          engagement={engagement}
          open={finishOpen}
          onOpenChange={setFinishOpen}
        />
      )}
    </>
  );
}
