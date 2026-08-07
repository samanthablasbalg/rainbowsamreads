import { type ReactNode, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar03Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorType } from '@/api/mutator/axios-instance';
import {
  engagementsGetEngagement,
  getEngagementsListEngagementsQueryKey,
  useEngagementsLogProgress,
} from '@/api/generated/engagements/engagements';
import { Format, ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { CoverImage } from '@/components/common/cover-image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsCoarsePointer } from '@/hooks/use-is-coarse-pointer';
import { formatMinutesAsHhmm, parseHhmmToMinutes } from '../utils/format-minutes';
import { localIsoDate } from '../utils/local-date';

type ProgressLogSheetProps = {
  engagement: EngagementRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Host-switch shape shared with confirm-provider.tsx: a real Dialog/Sheet (not the
// Alert variants -- this is a form, not a destructive confirmation, so backdrop-dismiss
// is fine) rendered unconditionally so ReadingCard's `open` state drives Base UI's own
// open/close animation instead of our own conditional mount. Base UI's Portal defaults
// to `keepMounted: false`, so it already unmounts everything inside once a close
// finishes -- the next open builds this component's state fresh from `engagement`,
// with nothing left over to reset by hand.
export function ProgressLogSheet({ engagement, open, onOpenChange }: ProgressLogSheetProps) {
  const isCoarsePointer = useIsCoarsePointer();

  return isCoarsePointer ? (
    <ProgressLogSheetHost engagement={engagement} open={open} onOpenChange={onOpenChange} />
  ) : (
    <ProgressLogDialogHost engagement={engagement} open={open} onOpenChange={onOpenChange} />
  );
}

// Exported alongside ProgressLogSheet so its stories can render each host directly --
// Storybook always runs under a fine (mouse) pointer, so useIsCoarsePointer() above
// never picks ProgressLogSheetHost on its own.
export function ProgressLogDialogHost({ engagement, open, onOpenChange }: ProgressLogSheetProps) {
  const title = engagement.book.title;
  const form = useProgressLogForm(engagement, () => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <ProgressLogIdentity engagement={engagement} TitleTag={DialogTitle} />
        </DialogHeader>

        <ProgressLogFields form={form} />

        {form.error && <p role="alert">{form.error}</p>}

        <DialogFooter>
          <Button variant="outline" disabled={form.savePending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={form.handleSave}
            disabled={!form.canSave || form.savePending}
            aria-label={`Save progress for ${title}`}
          >
            <ButtonLabel pending={form.savePending} pendingLabel="Saving…">
              Save
            </ButtonLabel>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProgressLogSheetHost({ engagement, open, onOpenChange }: ProgressLogSheetProps) {
  const title = engagement.book.title;
  const form = useProgressLogForm(engagement, () => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <ProgressLogIdentity engagement={engagement} TitleTag={SheetTitle} />
        </SheetHeader>

        <ProgressLogFields form={form} />

        {form.error && <p role="alert">{form.error}</p>}

        <SheetFooter>
          <Button
            onClick={form.handleSave}
            disabled={!form.canSave || form.savePending}
            aria-label={`Save progress for ${title}`}
          >
            <ButtonLabel pending={form.savePending} pendingLabel="Saving…">
              Save
            </ButtonLabel>
          </Button>
          <Button variant="outline" disabled={form.savePending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Cover + title, so the book being logged is unambiguous -- ADR-0019. `TitleTag` is
// whichever primitive's own Title component the host renders with, so the dialog/sheet
// keeps a real `aria-labelledby` association instead of a plain heading.
function ProgressLogIdentity({
  engagement,
  TitleTag,
}: {
  engagement: EngagementRead;
  TitleTag: typeof DialogTitle | typeof SheetTitle;
}) {
  return (
    <div className="flex items-center gap-3">
      <CoverImage
        src={engagement.cover_url ?? engagement.book.default_cover_url}
        title={engagement.book.title}
        className="h-16 w-11"
      />
      <TitleTag>{engagement.book.title}</TitleTag>
    </div>
  );
}

// Swaps a button's label for a spinner + verb-ing text while its own mutation is in
// flight, so a disabled button reads as "working" rather than just inert. `data-icon`
// is the same slot the Button component's own icon buttons key their padding off of
// (see streak-indicator.tsx, account-menu.tsx).
function ButtonLabel({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  if (!pending) return <>{children}</>;
  return (
    <>
      <HugeiconsIcon icon={Loading03Icon} className="animate-spin" data-icon="inline-start" />
      {pendingLabel}
    </>
  );
}

type ProgressLogForm = ReturnType<typeof useProgressLogForm>;

// Shared between both hosts, per the e2e page object's own comment: the sheet renders
// identically as a dialog or a bottom sheet, so one set of content drives both.
function ProgressLogFields({ form }: { form: ProgressLogForm }) {
  const today = localIsoDate();
  const yesterday = localIsoDate(-1);
  const isCustomDate = form.date !== today && form.date !== yesterday;
  const [year, month, day] = form.date.split('-').map(Number);
  const pickedDateLabel = isCustomDate
    ? new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : 'Pick a date';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">From</span>
          <span>{form.fromDisplay}</span>
        </div>

        <Field className="flex-1" data-invalid={!!form.positionError}>
          <FieldLabel htmlFor="progress-log-position">To · now</FieldLabel>
          {form.isAudio ? (
            <Input
              id="progress-log-position"
              type="text"
              inputMode="numeric"
              placeholder="--:--"
              value={form.position}
              onChange={(event) => form.setPosition(event.target.value)}
              onFocus={() => form.setPositionFocused(true)}
              onBlur={() => form.setPositionFocused(false)}
              aria-invalid={!!form.positionError}
            />
          ) : (
            <Input
              id="progress-log-position"
              type="text"
              inputMode="numeric"
              placeholder="---"
              value={form.position}
              onChange={(event) => form.setPosition(event.target.value)}
              onFocus={() => form.setPositionFocused(true)}
              onBlur={() => form.setPositionFocused(false)}
              aria-invalid={!!form.positionError}
            />
          )}
          <FieldError>{form.positionError}</FieldError>
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={form.date === today ? 'default' : 'outline'}
            size="sm"
            disabled={form.savePending}
            onClick={() => form.pickDate(today)}
          >
            Today
          </Button>
          <Button
            variant={form.date === yesterday ? 'default' : 'outline'}
            size="sm"
            disabled={form.savePending}
            onClick={() => form.pickDate(yesterday)}
          >
            Yesterday
          </Button>
          <Button
            variant={form.dateEditorOpen || isCustomDate ? 'default' : 'outline'}
            size="sm"
            disabled={form.savePending}
            onClick={() => form.setDateEditorOpen(!form.dateEditorOpen)}
          >
            <HugeiconsIcon icon={Calendar03Icon} data-icon="inline-start" />
            {pickedDateLabel}
          </Button>
        </div>

        {form.dateEditorOpen && (
          <Field>
            <FieldLabel htmlFor="progress-log-date">Log date</FieldLabel>
            <Input
              id="progress-log-date"
              type="date"
              max={today}
              value={form.date}
              onChange={(event) => form.setDate(event.target.value)}
            />
          </Field>
        )}
      </div>
    </div>
  );
}

function useProgressLogForm(engagement: EngagementRead, onClose: () => void) {
  const isAudio = engagement.formats.includes(Format.audio);
  const fromValue = isAudio ? engagement.resume_from_minute : engagement.resume_from_page;
  const fromDisplay = isAudio ? formatMinutesAsHhmm(fromValue) : String(fromValue);

  const [position, setPositionRaw] = useState('');
  const [positionFocused, setPositionFocused] = useState(false);
  const [dateEditorOpen, setDateEditorOpen] = useState(false);
  const [date, setDateRaw] = useState(localIsoDate);
  const [error, setError] = useState<string | null>(null);

  function setPosition(value: string) {
    setPositionRaw(value);
    setError(null);
  }

  function setDate(value: string) {
    setDateRaw(value);
    setError(null);
  }

  // The Today/Yesterday chips close the date editor, so exactly one chip ever reads
  // as selected.
  function pickDate(value: string) {
    setDate(value);
    setDateEditorOpen(false);
  }

  const queryClient = useQueryClient();

  const logProgress = useEngagementsLogProgress<ErrorType<{ detail?: string }>>({
    mutation: {
      // Patch just this engagement into the cached reading list instead of invalidating
      // it -- the list is ordered by most-recent activity, so a refetch here would jump
      // this book to the top mid-interaction. Refetching the single engagement (rather
      // than computing completion_pct client-side) keeps that math in one place: the
      // backend's `resolve_length`, which also accounts for edition-length overrides.
      onSuccess: async () => {
        const fresh = await engagementsGetEngagement(engagement.id);
        queryClient.setQueryData<EngagementRead[]>(
          getEngagementsListEngagementsQueryKey({ status: ReadingStatus.reading }),
          (current) => current?.map((e) => (e.id === fresh.id ? fresh : e))
        );
        onClose();
      },
      onError: (err) => {
        setError(err.response?.data?.detail ?? 'Failed to save. Please try again.');
      },
    },
  });

  const parsedPosition = isAudio
    ? parseHhmmToMinutes(position)
    : position.trim() === '' || Number.isNaN(Number(position))
      ? null
      : Number(position);

  const maxPosition = isAudio
    ? engagement.book.default_audio_minutes
    : engagement.book.default_page_count;
  const canSave =
    parsedPosition !== null &&
    parsedPosition >= fromValue &&
    (maxPosition == null || parsedPosition <= maxPosition);

  // Hidden while the field has focus, so an in-progress value (e.g. typing "1" toward
  // "100") doesn't flash an error before the user is done, and while it's empty --
  // Save is already disabled by canSave, this just isn't the field's error to raise.
  let positionError: string | null = null;
  if (!positionFocused && position.trim() !== '') {
    if (parsedPosition === null) {
      positionError = isAudio ? 'Enter a time in HH:MM format' : 'Enter a number';
    } else if (parsedPosition < fromValue) {
      positionError = isAudio
        ? `Can't be before ${fromDisplay}`
        : `Can't be before page ${fromValue}`;
    } else if (maxPosition != null && parsedPosition > maxPosition) {
      positionError = isAudio
        ? `Cannot exceed ${formatMinutesAsHhmm(maxPosition)}`
        : `Cannot exceed ${maxPosition} pages`;
    }
  }

  function handleSave() {
    if (parsedPosition === null) return;
    setError(null);
    logProgress.mutate({
      engagementId: engagement.id,
      data: {
        ...(isAudio ? { current_minute: parsedPosition } : { current_page: parsedPosition }),
        logged_on: date,
      },
    });
  }

  const savePending = logProgress.isPending;

  return {
    isAudio,
    fromDisplay,
    position,
    setPosition,
    setPositionFocused,
    positionError,
    dateEditorOpen,
    setDateEditorOpen,
    date,
    setDate,
    pickDate,
    canSave,
    handleSave,
    error,
    savePending,
  };
}
