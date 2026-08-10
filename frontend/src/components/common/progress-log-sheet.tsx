import { type ReactNode, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar03Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorType } from '@/api/mutator/axios-instance';
import {
  engagementsGetEngagement,
  getEngagementsGetEngagementQueryKey,
  getEngagementsListEngagementsQueryKey,
  getEngagementsListProgressLogsQueryKey,
  useEngagementsLogProgress,
} from '@/api/generated/engagements/engagements';
import { Format, ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { CoverImage } from '@/components/common/cover-image';
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
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
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

// Cover + title, so the book being logged is unambiguous -- ADR-0019. The title is the
// overlay's own Title part, so it keeps a real `aria-labelledby` association instead of
// being a plain heading that happens to sit at the top.
function ProgressLogIdentity({ engagement }: { engagement: EngagementRead }) {
  return (
    <div className="flex items-center gap-3">
      <CoverImage
        src={engagement.cover_url ?? engagement.book.default_cover_url}
        title={engagement.book.title}
        className="h-16 w-11"
      />
      <ResponsiveDialogTitle>{engagement.book.title}</ResponsiveDialogTitle>
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
  // Keyed on which control set the date rather than on the value, so a day chosen in
  // the calendar reads as the calendar's even when it happens to be today or yesterday.
  const fromPicker = form.dateSource === 'picker';
  const todaySelected = !fromPicker && form.date === today;
  const yesterdaySelected = !fromPicker && form.date === yesterday;
  const pickerSelected = form.dateEditorOpen || fromPicker;
  const [year, month, day] = form.date.split('-').map(Number);
  const pickedDateLabel = fromPicker
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
    dateSource,
    setDate,
    pickDate,
    canSave,
    handleSave,
    error,
    savePending,
  };
}
