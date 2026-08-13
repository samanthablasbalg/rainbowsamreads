import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { HistoryIcon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useEngagementsDeleteProgressLog,
  useEngagementsListProgressLogsSuspense,
} from '@/api/generated/engagements/engagements';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { toEntryViews, type EntryView } from '../utils/entry-view';
import { invalidateRead } from '../utils/invalidate-read';
import { EntryEditSheet } from './entry-edit-sheet';
import { EntryRow } from './entry-row';

// Every session logged against one read, newest first.
//
// Both overlays are owned here rather than by the row, and the delete confirmation is a
// sibling of the edit sheet rather than a child of it: Delete closes the sheet and opens
// the confirmation, so there is never a dialog inside a dialog. ADR-0031 keeps the
// confirmation itself as the one shared component.
export function EntryList({
  engagementId,
  onLogProgress,
}: {
  engagementId: string;
  // Absent on a read that is no longer in progress, which is what leaves a finished read
  // with nothing logged showing an empty state and no action.
  onLogProgress?: () => void;
}) {
  const { data: logs } = useEngagementsListProgressLogsSuspense(engagementId);
  const [editing, setEditing] = useState<EntryView | null>(null);
  const [deleting, setDeleting] = useState<EntryView | null>(null);

  const queryClient = useQueryClient();

  const deleteLog = useEngagementsDeleteProgressLog<DetailError>({
    mutation: {
      onSuccess: () => invalidateRead(queryClient, engagementId),
    },
  });

  function handleDelete() {
    if (deleting === null) return;
    const logId = deleting.id;
    setDeleting(null);
    deleteLog.mutate({ engagementId, logId });
  }

  return (
    <section aria-labelledby="entry-list-heading">
      <h2 id="entry-list-heading" className="mb-3 text-lg font-semibold">
        History
      </h2>

      {/* The delete goes through the API rather than the sheet, so its failure has no
          form to land in -- it is rendered here, next to the list it failed to change. */}
      {deleteLog.isError && (
        <p role="alert" className="text-sm text-destructive">
          {errorDetail(deleteLog.error, "Couldn't delete that entry. Please try again.")}
        </p>
      )}

      {logs.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={HistoryIcon} />
            </EmptyMedia>
            <EmptyTitle>Nothing logged yet</EmptyTitle>
            <EmptyDescription>Sessions you log against this read show up here.</EmptyDescription>
          </EmptyHeader>
          {onLogProgress && (
            <EmptyContent>
              <Button onClick={onLogProgress}>Log progress</Button>
            </EmptyContent>
          )}
        </Empty>
      )}

      {logs.length > 0 && (
        // labelledby rather than a second aria-label: the heading above already names
        // this list, and repeating the word would announce it twice.
        <ul aria-labelledby="entry-list-heading" className="flex flex-col">
          {toEntryViews(logs).map((entry) => (
            <EntryRow key={entry.id} entry={entry} onEdit={() => setEditing(entry)} />
          ))}
        </ul>
      )}

      {editing && (
        <EntryEditSheet
          engagementId={engagementId}
          entry={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onRequestDelete={() => {
            setDeleting(editing);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this entry?"
        description={
          deleting
            ? `The session from ${deleting.dateLabel} will be removed and your progress will go back to where it was before it. This can't be undone.`
            : ''
        }
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
      />
    </section>
  );
}
