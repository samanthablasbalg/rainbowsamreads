import { useState } from 'react';
import { HistoryIcon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useEngagementsDeleteProgressLog,
  useEngagementsListProgressLogsSuspense,
} from '@/api/generated/engagements/engagements';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorText } from '@/components/common/error-text';
import { Button } from '@/components/ui/button';
import { toEntryViews, type EntryView } from '../utils/entry-view';
import { invalidateRead } from '../utils/invalidate-read';
import { EntryEditSheet } from './entry-edit-sheet';
import { EntryRow } from './entry-row';

export function EntryList({
  engagementId,
  onLogProgress,
}: {
  engagementId: string;
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

      {deleteLog.isError && (
        <ErrorText>
          {errorDetail(deleteLog.error, "Couldn't delete that entry. Please try again.")}
        </ErrorText>
      )}

      {logs.length === 0 && (
        <EmptyState
          icon={HistoryIcon}
          title="Nothing logged yet"
          description="Sessions you log against this read show up here."
          action={onLogProgress && <Button onClick={onLogProgress}>Log progress</Button>}
        />
      )}

      {logs.length > 0 && (
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
