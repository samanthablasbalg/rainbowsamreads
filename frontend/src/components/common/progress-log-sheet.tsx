import { useRef, useState, type FocusEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight02Icon, Calendar03Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { errorDetail, type DetailError } from '@/api/error-detail';
import {
  engagementsGetEngagement,
  getEngagementsGetEngagementQueryKey,
  getEngagementsListEngagementsQueryKey,
  getEngagementsListProgressLogsQueryKey,
  useEngagementsLogProgress,
} from '@/api/generated/engagements/engagements';
import {
  Format,
  LogUnit,
  ReadingStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { ButtonLabel } from '@/components/common/button-label';
import { CoverImage } from '@/components/common/cover-image';
import { ErrorText } from '@/components/common/error-text';
import { FormatIcons } from '@/components/common/format-icons';
import { NoteField } from '@/components/common/note-field';
import { PositionInput } from '@/components/common/position-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { coverSrc } from '@/utils/book';
import { FORMATS } from '@/utils/format';
import { formatMinutesAsHhmm } from '@/utils/format-minutes';
import { localIsoDate } from '@/utils/local-date';
import { formatPosition, parsePosition } from '@/utils/position';

type ProgressLogSheetProps = {
  engagement: EngagementRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProgressLogSheet({ engagement, open, onOpenChange }: ProgressLogSheetProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      {/* Base UI moves focus to the popup's first tabbable element, which here is the
          position field -- the sheet would open with a caret sitting in it. Focusing the
          popup itself is what Base UI already does when the sheet is opened by touch. */}
      <ResponsiveDialogContent ref={popupRef} initialFocus={popupRef}>
        <ProgressLogForm engagement={engagement} onDone={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function ProgressLogForm({
  engagement,
  onDone,
}: {
  engagement: EngagementRead;
  onDone: () => void;
}) {
  const title = engagement.book.title;
  const form = useProgressLogForm(engagement, onDone);

  return (
    <>
      <ResponsiveDialogHeader>
        <ProgressLogIdentity engagement={engagement} />
      </ResponsiveDialogHeader>

      <ResponsiveDialogBody>
        <ProgressLogFields form={form} />

        {form.error && <ErrorText>{form.error}</ErrorText>}
      </ResponsiveDialogBody>

      <ResponsiveDialogFooter>
        <Button variant="outline" disabled={form.savePending} onClick={onDone}>
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
      </ResponsiveDialogFooter>
    </>
  );
}

function ProgressLogIdentity({ engagement }: { engagement: EngagementRead }) {
  return (
    <div className="flex items-center gap-3">
      <CoverImage src={coverSrc(engagement)} title={engagement.book.title} className="h-16 w-11" />
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <ResponsiveDialogTitle>{engagement.book.title}</ResponsiveDialogTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          <FormatIcons formats={engagement.formats} />
        </div>
      </div>
    </div>
  );
}

type ProgressLogForm = ReturnType<typeof useProgressLogForm>;

const POSITION_LABEL_CLASS = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase';

// `md:text-3xl` is not redundant: Input drops to `md:text-sm` above that breakpoint.
const POSITION_INPUT_CLASS =
  'h-auto rounded-none border-0 border-b-2 border-primary bg-transparent px-0 py-1 text-3xl leading-none font-bold md:text-3xl';

// The From cell in its two states. Both carry `py-1` and a 2px bottom edge -- the button's
// transparent -- so opening the editor swaps the control without moving the row.
const FROM_INPUT_CLASS =
  'h-auto rounded-none border-0 border-b-2 border-primary bg-transparent px-0 py-1 text-xl leading-none font-bold text-muted-foreground md:text-xl';

const FROM_BUTTON_CLASS =
  'h-auto justify-self-start border-b-2 border-transparent p-0 py-1 text-xl leading-none font-bold text-muted-foreground underline decoration-dotted underline-offset-4 hover:decoration-solid';

function ProgressLogFields({ form }: { form: ProgressLogForm }) {
  const today = localIsoDate();
  const yesterday = localIsoDate(-1);
  const fromPicker = form.dateSource === 'picker';
  const pickerSelected = form.dateEditorOpen || fromPicker;
  const todaySelected = !pickerSelected && form.date === today;
  const yesterdaySelected = !pickerSelected && form.date === yesterday;
  const [year, month, day] = form.date.split('-').map(Number);
  const pickedDateLabel = fromPicker
    ? new Date(year, month - 1, day).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : 'Pick a date';

  return (
    <div className="flex flex-col gap-4">
      {form.unitSwitchFormat && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={form.isAudio ? 'outline' : 'default'}
            aria-pressed={!form.isAudio}
            size="sm"
            disabled={form.savePending}
            onClick={() => form.pickUnit(LogUnit.pages)}
          >
            <HugeiconsIcon icon={FORMATS[form.unitSwitchFormat].icon} data-icon="inline-start" />
            Pages
          </Button>
          <Button
            variant={form.isAudio ? 'default' : 'outline'}
            aria-pressed={form.isAudio}
            size="sm"
            disabled={form.savePending}
            onClick={() => form.pickUnit(LogUnit.minutes)}
          >
            <HugeiconsIcon icon={FORMATS[Format.audio].icon} data-icon="inline-start" />
            Minutes
          </Button>
        </div>
      )}

      {/* A fixed first track rather than `auto`: the From cell holds a button one moment
          and an input the next, and the two columns beside it can't shift when it does. */}
      <Card
        size="sm"
        className="grid grid-cols-[5rem_auto_1fr_auto] items-center gap-x-3 gap-y-1 px-(--card-spacing)"
      >
        <span className={cn('col-start-1 row-start-1', POSITION_LABEL_CLASS)}>From</span>
        <FieldLabel
          htmlFor="progress-log-position"
          className={cn('col-start-3 row-start-1', POSITION_LABEL_CLASS)}
        >
          To · now
        </FieldLabel>

        {form.from.isEditing ? (
          <PositionInput
            autoFocus
            className={cn('col-start-1 row-start-2', FROM_INPUT_CLASS)}
            isAudio={form.isAudio}
            aria-label="start position"
            aria-invalid={!!form.from.error}
            value={form.from.value}
            onValueChange={form.from.set}
            onFocus={form.from.focus}
            onBlur={form.from.blur}
          />
        ) : (
          <Button
            variant="link"
            className={cn('col-start-1 row-start-2', FROM_BUTTON_CLASS)}
            aria-label="Edit start position"
            disabled={form.savePending}
            onClick={form.from.edit}
          >
            {form.from.value}
          </Button>
        )}

        <HugeiconsIcon
          icon={ArrowRight02Icon}
          className="col-start-2 row-start-2 text-muted-foreground"
        />

        <PositionInput
          id="progress-log-position"
          className={cn('col-start-3 row-start-2', POSITION_INPUT_CLASS)}
          isAudio={form.isAudio}
          value={form.position}
          onValueChange={form.setPosition}
          onFocus={() => form.setPositionFocused(true)}
          onBlur={() => form.setPositionFocused(false)}
          aria-invalid={!!form.positionError}
        />

        {form.maxDisplay && (
          <span className="col-start-4 row-start-2 text-sm font-semibold whitespace-nowrap text-muted-foreground">
            of {form.maxDisplay}
          </span>
        )}

        {/* One slot for both fields: the From column is too narrow to hold a message of
            its own, and its error wins, since To is only valid relative to From. */}
        <FieldError className="col-start-1 col-end-5 row-start-3">
          {form.from.error ?? form.positionError}
        </FieldError>
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={todaySelected ? 'default' : 'outline'}
            aria-pressed={todaySelected}
            size="sm"
            disabled={form.savePending}
            onClick={() => form.pickDate(today)}
          >
            Today
          </Button>
          <Button
            variant={yesterdaySelected ? 'default' : 'outline'}
            aria-pressed={yesterdaySelected}
            size="sm"
            disabled={form.savePending}
            onClick={() => form.pickDate(yesterday)}
          >
            Yesterday
          </Button>
          <Button
            variant={pickerSelected ? 'default' : 'outline'}
            aria-pressed={pickerSelected}
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

      <NoteField
        id="progress-log-note"
        value={form.note}
        onValueChange={form.setNote}
        disabled={form.savePending}
      />
    </div>
  );
}

// The From cell is a value at rest that turns into a field: the overwhelming majority of
// sessions start where the last one ended, so the prefill is already right and only a
// catch-up pass needs to type over it. `blurred` exists to hold the error back until the
// field is left -- a half-typed number isn't a wrong one.
type FromState = 'rest' | 'focused' | 'blurred';

function useEditableFrom({
  isAudio,
  prefill,
  ceiling,
  onChange,
}: {
  isAudio: boolean;
  prefill: number;
  // How far a session may start, which is the frontier, not the prefill: with a catch-up
  // open the read resumes behind the frontier, and abandoning the catch-up to pick back
  // up at it is a legal move.
  ceiling: number;
  onChange: () => void;
}) {
  const [value, setValue] = useState(() => formatPosition(prefill, isAudio));
  const [state, setState] = useState<FromState>('rest');

  const parsed = parsePosition(value, isAudio);
  // The start the session will be saved with, or null while what's typed isn't one.
  const start = parsed !== null && parsed >= 0 && parsed <= ceiling ? parsed : null;
  const startDisplay = start === null ? null : formatPosition(start, isAudio);

  function message(): string | null {
    if (parsed === null || parsed < 0)
      return isAudio ? 'Enter a time in HH:MM format' : 'Enter a number';
    if (parsed > ceiling) {
      return isAudio
        ? `Can't start past ${formatMinutesAsHhmm(ceiling)}`
        : `Can't start past page ${ceiling}`;
    }
    return null;
  }

  return {
    value,
    start,
    startDisplay,
    isEditing: state !== 'rest',
    error: state === 'blurred' ? message() : null,
    set(next: string) {
      setValue(next);
      onChange();
    },
    // A unit switch is a different ruler, so the typed position can't carry over.
    reset(next: number, nextIsAudio: boolean) {
      setValue(formatPosition(next, nextIsAudio));
      setState('rest');
    },
    edit() {
      setState('focused');
    },
    focus(event: FocusEvent<HTMLInputElement>) {
      setState('focused');
      // The editor opens on a value that is usually being replaced wholesale, so a page
      // typed over it lands on its own. HhmmInput pins its own caret to the end instead,
      // which is the only spot its digit-shifting makes sense from.
      if (!isAudio) event.currentTarget.select();
    },
    blur() {
      // Back to a value at rest, but only once it is one -- collapsing on something the
      // error row is about to complain about would hide what the complaint is aimed at.
      if (startDisplay === null) {
        setState('blurred');
        return;
      }
      setValue(startDisplay);
      setState('rest');
    },
  };
}

function useProgressLogForm(engagement: EngagementRead, onClose: () => void) {
  // Pages can't tell print from digital (ADR-0021), so anything measured in them answers
  // on the first non-audio binding -- the same rule the backend's page_format applies.
  const pageFormat = engagement.formats.find((format) => format !== Format.audio) ?? null;
  // Non-null only when the read is bound in both rulers: on a single-format read the
  // switch would be one chip that does nothing. It also carries the icon for the pages
  // chip, so a digital + audio read doesn't show a print book.
  const unitSwitchFormat = engagement.formats.includes(Format.audio) ? pageFormat : null;

  // The unit belongs to the session, not to the read -- one bound in both logs pages the
  // days it was read and minutes the days it was heard. It opens on the frontier's own
  // unit, which is the ruler the last session left off on, and on a read with nothing
  // logged yet falls back to whichever one it can actually log against.
  const [unit, setUnit] = useState(
    engagement.resume_unit ?? (pageFormat === null ? LogUnit.minutes : LogUnit.pages)
  );
  const isAudio = unit === LogUnit.minutes;
  // Where a session on this ruler picks up: the shared frontier, or this ruler's own last
  // position when the pass that set it was re-coverage (the backend's Rule 3).
  const resumeValue = isAudio ? engagement.resume_from_minute : engagement.resume_from_page;

  const [position, setPositionRaw] = useState('');
  const [positionFocused, setPositionFocused] = useState(false);
  const [dateEditorOpen, setDateEditorOpen] = useState(false);
  const [date, setDateRaw] = useState(localIsoDate);
  const [dateSource, setDateSource] = useState<'chip' | 'picker'>('chip');
  const [note, setNoteRaw] = useState('');
  const [error, setError] = useState<string | null>(null);

  const from = useEditableFrom({
    isAudio,
    prefill: resumeValue,
    ceiling: isAudio ? engagement.frontier_minute : engagement.frontier_page,
    onChange: () => setError(null),
  });

  function setPosition(value: string) {
    setPositionRaw(value);
    setError(null);
  }

  function pickUnit(picked: LogUnit) {
    if (picked === unit) return;
    setUnit(picked);
    // Pages and minutes aren't interchangeable, so neither position typed on one ruler
    // can carry over to the other -- the start goes back to the new ruler's own prefill.
    const nextIsAudio = picked === LogUnit.minutes;
    setPositionRaw('');
    from.reset(
      nextIsAudio ? engagement.resume_from_minute : engagement.resume_from_page,
      nextIsAudio
    );
    setError(null);
  }

  function setDate(value: string) {
    setDateRaw(value);
    setDateSource('picker');
    setError(null);
  }

  function pickDate(value: string) {
    setDateRaw(value);
    setDateSource('chip');
    setError(null);
    setDateEditorOpen(false);
  }

  function setNote(value: string) {
    setNoteRaw(value);
    setError(null);
  }

  const queryClient = useQueryClient();

  const logProgress = useEngagementsLogProgress<DetailError>({
    mutation: {
      // Patched into the cached list, never invalidated: the list is ordered by
      // most-recent activity, so a refetch would jump this book to the top mid-interaction.
      // completion_pct comes back from the server rather than being computed here, so the
      // length maths stays in the backend's `resolve_length`.
      onSuccess: async () => {
        const fresh = await engagementsGetEngagement(engagement.id);
        queryClient.setQueryData<EngagementRead[]>(
          getEngagementsListEngagementsQueryKey({ status: ReadingStatus.reading }),
          (current) => current?.map((e) => (e.id === fresh.id ? fresh : e))
        );

        // For the read page, which mounts this sheet too. Unconditional: from Currently
        // Reading these land on queries nothing is rendering, costing a cache write.
        queryClient.setQueryData(getEngagementsGetEngagementQueryKey(fresh.id), fresh);
        await queryClient.invalidateQueries({
          queryKey: getEngagementsListProgressLogsQueryKey(engagement.id),
        });

        onClose();
      },
      onError: (err) => {
        setError(errorDetail(err, 'Failed to save. Please try again.'));
      },
    },
  });

  const { start, startDisplay } = from;
  const parsedPosition = parsePosition(position, isAudio);

  const maxPosition = isAudio ? engagement.length_minutes : engagement.length_pages;
  const maxDisplay = maxPosition == null ? null : formatPosition(maxPosition, isAudio);
  const hasNote = note.trim() !== '';
  const canSave =
    start !== null &&
    parsedPosition !== null &&
    (parsedPosition > start || (parsedPosition === start && hasNote)) &&
    (maxPosition == null || parsedPosition <= maxPosition);

  const notANumber = isAudio ? 'Enter a time in HH:MM format' : 'Enter a number';

  function endMessage(): string | null {
    // Nothing to say about the end while the start it is measured against isn't a
    // position yet -- that error is the one the row is showing.
    if (start === null || position.trim() === '') return null;
    if (parsedPosition === null) return notANumber;
    if (parsedPosition < start) return "Can't end before the session started";
    if (parsedPosition === start && !hasNote) {
      return isAudio
        ? `Add a note, or advance past ${startDisplay}`
        : `Add a note, or advance past page ${start}`;
    }
    if (maxPosition != null && parsedPosition > maxPosition) {
      return isAudio
        ? `Cannot exceed ${formatMinutesAsHhmm(maxPosition)}`
        : `Cannot exceed ${maxPosition} pages`;
    }
    return null;
  }

  // Both held back until the field is left: a half-typed number isn't a wrong one.
  const positionError = positionFocused ? null : endMessage();

  function handleSave() {
    if (start === null || parsedPosition === null) return;
    setError(null);
    logProgress.mutate({
      engagementId: engagement.id,
      data: {
        ...(isAudio
          ? { minute_start: start, minute_end: parsedPosition }
          : { page_start: start, page_end: parsedPosition }),
        logged_on: date,
        ...(hasNote && { note }),
      },
    });
  }

  const savePending = logProgress.isPending;

  return {
    isAudio,
    unitSwitchFormat,
    pickUnit,
    from,
    maxDisplay,
    position,
    setPosition,
    setPositionFocused,
    positionError,
    dateEditorOpen,
    setDateEditorOpen,
    date,
    dateSource,
    setDate,
    pickDate,
    note,
    setNote,
    canSave,
    handleSave,
    error,
    savePending,
  };
}
