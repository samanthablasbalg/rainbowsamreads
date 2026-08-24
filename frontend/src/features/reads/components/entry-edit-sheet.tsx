import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEngagementsUpdateProgressLog } from '@/api/generated/engagements/engagements';
import type { ProgressLogUpdate } from '@/api/generated/readingTracker.schemas';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { ButtonLabel } from '@/components/common/button-label';
import { ErrorText } from '@/components/common/error-text';
import { NoteField } from '@/components/common/note-field';
import { PositionInput } from '@/components/common/position-input';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { formatMinutesAsHhmm } from '@/utils/format-minutes';
import { localIsoDate } from '@/utils/local-date';
import { formatPosition, parsePosition } from '@/utils/position';
import type { EntryView } from '../utils/entry-view';
import { invalidateRead } from '../utils/invalidate-read';

type EntryEditSheetProps = {
  engagementId: string;
  entry: EntryView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestDelete: () => void;
};

export function EntryEditSheet({
  engagementId,
  entry,
  open,
  onOpenChange,
  onRequestDelete,
}: EntryEditSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <EntryEditForm
          engagementId={engagementId}
          entry={entry}
          onDone={() => onOpenChange(false)}
          onRequestDelete={onRequestDelete}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function EntryEditForm({
  engagementId,
  entry,
  onDone,
  onRequestDelete,
}: {
  engagementId: string;
  entry: EntryView;
  onDone: () => void;
  onRequestDelete: () => void;
}) {
  const form = useEntryEditForm(engagementId, entry, onDone);

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{entry.dateLabel}</ResponsiveDialogTitle>
      </ResponsiveDialogHeader>

      <ResponsiveDialogBody>
        <Field>
          <FieldLabel htmlFor="entry-date">Log date</FieldLabel>
          <Input
            id="entry-date"
            type="date"
            max={localIsoDate()}
            value={form.date}
            disabled={form.savePending}
            onChange={(event) => form.setDate(event.target.value)}
          />
        </Field>

        {/* The backend only accepts a position change on the newest entry of the read, so
            an older one gets the reason instead of a field it would reject. The date
            above stays editable either way -- that rule is only about the position. */}
        {entry.isNewest ? (
          <Field data-invalid={!!form.positionError}>
            <FieldLabel htmlFor="entry-position">
              {entry.isAudio ? 'Ended at' : 'Ended at page'}
            </FieldLabel>
            <PositionInput
              id="entry-position"
              isAudio={entry.isAudio}
              value={form.position}
              disabled={form.savePending}
              onValueChange={form.setPosition}
              onFocus={() => form.setPositionFocused(true)}
              onBlur={() => form.setPositionFocused(false)}
              aria-invalid={!!form.positionError}
            />
            <FieldError>{form.positionError}</FieldError>
          </Field>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only the most recent session&apos;s {entry.isAudio ? 'time' : 'pages'} can be changed.
          </p>
        )}

        <NoteField
          id="entry-note"
          value={form.note}
          onValueChange={form.setNote}
          disabled={form.savePending}
        />

        {form.error && <ErrorText>{form.error}</ErrorText>}
      </ResponsiveDialogBody>

      <ResponsiveDialogFooter>
        {entry.isNewest && (
          <Button
            variant="destructive"
            className="sm:mr-auto"
            disabled={form.savePending}
            aria-label={`Delete entry from ${entry.dateLabel}`}
            onClick={onRequestDelete}
          >
            Delete
          </Button>
        )}
        <Button variant="outline" disabled={form.savePending} onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={form.handleSave} disabled={!form.canSave || form.savePending}>
          <ButtonLabel pending={form.savePending} pendingLabel="Saving…">
            Save
          </ButtonLabel>
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

function useEntryEditForm(engagementId: string, entry: EntryView, onDone: () => void) {
  const [date, setDateRaw] = useState(entry.loggedOn);
  const [position, setPositionRaw] = useState(() => formatPosition(entry.end, entry.isAudio));
  const [positionFocused, setPositionFocused] = useState(false);
  const [note, setNoteRaw] = useState(entry.note ?? '');
  const [error, setError] = useState<string | null>(null);

  function setDate(value: string) {
    setDateRaw(value);
    setError(null);
  }

  function setPosition(value: string) {
    setPositionRaw(value);
    setError(null);
  }

  function setNote(value: string) {
    setNoteRaw(value);
    setError(null);
  }

  const queryClient = useQueryClient();

  const updateLog = useEngagementsUpdateProgressLog<DetailError>({
    mutation: {
      onSuccess: async () => {
        await invalidateRead(queryClient, engagementId);
        onDone();
      },
      onError: (err) => {
        setError(errorDetail(err, 'Failed to save. Please try again.'));
      },
    },
  });

  const parsedPosition = parsePosition(position, entry.isAudio);

  let positionError: string | null = null;
  if (
    entry.isNewest &&
    !positionFocused &&
    position.trim() !== '' &&
    parsedPosition !== entry.end
  ) {
    if (parsedPosition === null) {
      positionError = entry.isAudio ? 'Enter a time in HH:MM format' : 'Enter a number';
    } else if (parsedPosition <= entry.splitAt) {
      positionError = entry.isAudio
        ? `Must be past ${formatMinutesAsHhmm(entry.splitAt)}`
        : `Must be past page ${entry.splitAt}`;
    }
  }

  const dateChanged = date !== entry.loggedOn;
  const positionChanged = entry.isNewest && parsedPosition !== null && parsedPosition !== entry.end;
  const positionValid =
    !entry.isNewest || (parsedPosition !== null && parsedPosition > entry.splitAt);
  const trimmedNote = note.trim();
  const noteChanged = trimmedNote !== (entry.note ?? '');

  const canSave = date !== '' && positionValid && (dateChanged || positionChanged || noteChanged);

  function handleSave() {
    const data: ProgressLogUpdate = {};
    if (dateChanged) data.logged_on = date;
    if (positionChanged) {
      if (entry.isAudio) data.minute_end = parsedPosition;
      else data.page_end = parsedPosition;
    }
    if (noteChanged) data.note = trimmedNote;

    setError(null);
    updateLog.mutate({ engagementId, logId: entry.id, data });
  }

  return {
    date,
    setDate,
    position,
    setPosition,
    setPositionFocused,
    positionError,
    note,
    setNote,
    canSave,
    handleSave,
    error,
    savePending: updateLog.isPending,
  };
}
