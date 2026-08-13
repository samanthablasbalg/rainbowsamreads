import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEngagementsUpdateProgressLog } from '@/api/generated/engagements/engagements';
import type { ProgressLogUpdate } from '@/api/generated/readingTracker.schemas';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { ButtonLabel } from '@/components/common/button-label';
import { HhmmInput } from '@/components/common/hhmm-input';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { formatMinutesAsHhmm, parseHhmmToMinutes } from '@/utils/format-minutes';
import { localIsoDate } from '@/utils/local-date';
import type { EntryView } from '../utils/entry-view';
import { invalidateRead } from '../utils/invalidate-read';

type EntryEditSheetProps = {
  engagementId: string;
  entry: EntryView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestDelete: () => void;
};

// Editing one logged session. Separate from ProgressLogSheet rather than a mode of it:
// that one POSTs a new log, bounds its position by the read's resume point, and offers
// Today/Yesterday chips -- all three of which are wrong here, where the operation is a
// PATCH, the bound is this entry's own start, and the date being fixed is usually
// months old.
//
// The split between this and the form below is the one ProgressLogSheet documents:
// everything under ResponsiveDialogContent lives in a portal that tears its subtree down
// on close, so the form's state has to live there to re-seed from the entry each time it
// opens rather than showing the last edit's values.
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

      <div className="flex flex-col gap-4">
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
            {entry.isAudio ? (
              <HhmmInput
                id="entry-position"
                value={form.position}
                disabled={form.savePending}
                onValueChange={form.setPosition}
                onFocus={() => form.setPositionFocused(true)}
                onBlur={() => form.setPositionFocused(false)}
                aria-invalid={!!form.positionError}
              />
            ) : (
              <Input
                id="entry-position"
                type="text"
                inputMode="numeric"
                placeholder="---"
                value={form.position}
                disabled={form.savePending}
                onChange={(event) => form.setPosition(event.target.value)}
                onFocus={() => form.setPositionFocused(true)}
                onBlur={() => form.setPositionFocused(false)}
                aria-invalid={!!form.positionError}
              />
            )}
            <FieldError>{form.positionError}</FieldError>
          </Field>
        ) : (
          <p className="text-sm text-muted-foreground">
            Only the most recent session&apos;s {entry.isAudio ? 'time' : 'pages'} can be changed.
          </p>
        )}
      </div>

      {form.error && <p role="alert">{form.error}</p>}

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
  const [position, setPositionRaw] = useState(() =>
    entry.isAudio ? formatMinutesAsHhmm(entry.end) : String(entry.end)
  );
  const [positionFocused, setPositionFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setDate(value: string) {
    setDateRaw(value);
    setError(null);
  }

  function setPosition(value: string) {
    setPositionRaw(value);
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

  const parsedPosition = entry.isAudio
    ? parseHhmmToMinutes(position)
    : position.trim() === '' || Number.isNaN(Number(position))
      ? null
      : Number(position);

  // No upper bound here: the book's length lives on the engagement, not on the entry, and
  // the backend rejects anything past it with a message this sheet already renders. The
  // lower bound is the entry's own start, which is the rule the API states.
  let positionError: string | null = null;
  if (entry.isNewest && !positionFocused && position.trim() !== '') {
    if (parsedPosition === null) {
      positionError = entry.isAudio ? 'Enter a time in HH:MM format' : 'Enter a number';
    } else if (parsedPosition <= entry.start) {
      positionError = entry.isAudio
        ? `Must be past ${formatMinutesAsHhmm(entry.start)}`
        : `Must be past page ${entry.start}`;
    }
  }

  const dateChanged = date !== entry.loggedOn;
  const positionChanged = entry.isNewest && parsedPosition !== null && parsedPosition !== entry.end;
  const positionValid =
    !entry.isNewest || (parsedPosition !== null && parsedPosition > entry.start);

  // Nothing to send is not an error, it just isn't a save -- so an untouched sheet has a
  // disabled Save rather than one that fires an empty PATCH.
  const canSave = date !== '' && positionValid && (dateChanged || positionChanged);

  function handleSave() {
    const data: ProgressLogUpdate = {};
    if (dateChanged) data.logged_on = date;
    if (positionChanged) {
      if (entry.isAudio) data.minute_end = parsedPosition;
      else data.page_end = parsedPosition;
    }

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
    canSave,
    handleSave,
    error,
    savePending: updateLog.isPending,
  };
}
