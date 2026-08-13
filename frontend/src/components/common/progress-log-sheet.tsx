import { useRef, useState } from 'react';
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
import { Format, ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { ButtonLabel } from '@/components/common/button-label';
import { CoverImage } from '@/components/common/cover-image';
import { FormatIcons } from '@/components/common/format-icons';
import { HhmmInput } from '@/components/common/hhmm-input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { cn } from '@/lib/utils';
import { formatMinutesAsHhmm, parseHhmmToMinutes } from '@/utils/format-minutes';
import { localIsoDate } from '@/utils/local-date';

type ProgressLogSheetProps = {
  engagement: EngagementRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// The split between this component and ProgressLogForm is the whole point rather than
// tidiness: everything below ResponsiveDialogContent lives inside Base UI's portal,
// which defaults to keepMounted={false} and tears its subtree down once a close
// animation finishes. Putting the form's state in a component rendered *there* is what
// makes a reopened sheet start empty. Held here instead, it would belong to a component
// ReadingCard never unmounts, and would survive every close -- which is exactly the bug
// this replaced.
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

      <ProgressLogFields form={form} />

      {form.error && <p role="alert">{form.error}</p>}

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

// Cover, title and format, so the book being logged is unambiguous -- ADR-0019. The
// title is the overlay's own Title part, so it keeps a real `aria-labelledby`
// association instead of being a plain heading that happens to sit at the top. The
// format chip sits on its own line under the title, as it does on ReadingCard: a
// multi-format read shows two, and as a chip it no longer sits on the title's baseline.
function ProgressLogIdentity({ engagement }: { engagement: EngagementRead }) {
  return (
    <div className="flex items-center gap-3">
      <CoverImage
        src={engagement.cover_url ?? engagement.book.default_cover_url}
        title={engagement.book.title}
        className="h-16 w-11"
      />
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

// The position is what the sheet exists to capture, so it is set at display size and
// stripped back to an underline rather than wearing Input's pill. Everything else the
// primitive brings -- the focus ring, aria-invalid's destructive border -- still applies:
// `border-b-2` only replaces the box, and the ring reads as a rectangle here.
// `md:text-3xl` is not redundant: Input drops to `md:text-sm` above that breakpoint.
const POSITION_INPUT_CLASS =
  'h-auto rounded-none border-0 border-b-2 border-primary bg-transparent px-0 py-1 text-3xl leading-none font-bold md:text-3xl';

// Shared between both hosts, per the e2e page object's own comment: the sheet renders
// identically as a dialog or a bottom sheet, so one set of content drives both.
function ProgressLogFields({ form }: { form: ProgressLogForm }) {
  const today = localIsoDate();
  const yesterday = localIsoDate(-1);
  // Keyed on which control set the date rather than on the value, so a day chosen in
  // the calendar reads as the calendar's even when it happens to be today or yesterday.
  const fromPicker = form.dateSource === 'picker';
  // The picker wins from the moment its editor opens, before a day has been chosen --
  // `date` is still today at that point, so the chips have to defer to it rather than
  // read their own value, or Today stays lit alongside it.
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
      {/* Card is the repo's panel: bg-card, the ring and the radius, its column layout
          overridden the same way ReadingCard overrides it.

          A grid, not a row of stacked columns: the two labels belong on one line and the
          two values on the next, and flex can only get that by the columns happening to
          be the same height -- which they are not, since one holds text and the other an
          input. Every child is placed explicitly so the arrow and the total sit on the
          value row without a margin pushing them there, and so an error can span beneath
          the field without disturbing either row. */}
      <Card
        size="sm"
        className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-3 gap-y-1 px-(--card-spacing)"
      >
        <span className={cn('col-start-1 row-start-1', POSITION_LABEL_CLASS)}>From</span>
        <FieldLabel
          htmlFor="progress-log-position"
          className={cn('col-start-3 row-start-1', POSITION_LABEL_CLASS)}
        >
          To · now
        </FieldLabel>

        {/* Deliberately smaller than the To field: From is where the read already was,
            To is the thing being entered, and matching their sizes made the panel read as
            two equal inputs. */}
        <span className="col-start-1 row-start-2 text-xl leading-none font-bold text-muted-foreground">
          {form.fromDisplay}
        </span>

        <HugeiconsIcon
          icon={ArrowRight02Icon}
          className="col-start-2 row-start-2 text-muted-foreground"
        />

        {form.isAudio ? (
          <HhmmInput
            id="progress-log-position"
            className={cn('col-start-3 row-start-2', POSITION_INPUT_CLASS)}
            value={form.position}
            onValueChange={form.setPosition}
            onFocus={() => form.setPositionFocused(true)}
            onBlur={() => form.setPositionFocused(false)}
            aria-invalid={!!form.positionError}
          />
        ) : (
          <Input
            id="progress-log-position"
            className={cn('col-start-3 row-start-2', POSITION_INPUT_CLASS)}
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

        {form.maxDisplay && (
          <span className="col-start-4 row-start-2 text-sm font-semibold whitespace-nowrap text-muted-foreground">
            of {form.maxDisplay}
          </span>
        )}

        <FieldError className="col-start-3 col-end-5 row-start-3">{form.positionError}</FieldError>
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* aria-pressed, not styling alone: these are toggles, and which one is
              active needs to reach a screen reader as state rather than as a colour. */}
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
  // Which control set `date`, not just what it is. Picking yesterday in the calendar
  // would otherwise light the Yesterday chip as well as the calendar one, since the
  // chips can't tell that value apart from their own.
  const [dateSource, setDateSource] = useState<'chip' | 'picker'>('chip');
  const [error, setError] = useState<string | null>(null);

  function setPosition(value: string) {
    setPositionRaw(value);
    setError(null);
  }

  function setDate(value: string) {
    setDateRaw(value);
    setDateSource('picker');
    setError(null);
  }

  // The Today/Yesterday chips close the date editor, so exactly one chip ever reads
  // as selected.
  function pickDate(value: string) {
    setDateRaw(value);
    setDateSource('chip');
    setError(null);
    setDateEditorOpen(false);
  }

  const queryClient = useQueryClient();

  const logProgress = useEngagementsLogProgress<DetailError>({
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

        // The read page mounts this sheet too, and reads the same engagement through its
        // own query and a list of its logs. Seeding the one and invalidating the other is
        // unconditional rather than told-where-it-is: from Currently Reading these land on
        // queries nothing is rendering, which costs a cache write and no request.
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

  const parsedPosition = isAudio
    ? parseHhmmToMinutes(position)
    : position.trim() === '' || Number.isNaN(Number(position))
      ? null
      : Number(position);

  const maxPosition = isAudio
    ? engagement.book.default_audio_minutes
    : engagement.book.default_page_count;
  // Null for a book with no recorded length, which is why the "of N" it feeds renders
  // conditionally rather than showing "of null".
  const maxDisplay =
    maxPosition == null ? null : isAudio ? formatMinutesAsHhmm(maxPosition) : String(maxPosition);
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
    canSave,
    handleSave,
    error,
    savePending,
  };
}
