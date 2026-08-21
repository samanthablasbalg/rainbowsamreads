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
import { ErrorText } from '@/components/common/error-text';
import { FormatIcons } from '@/components/common/format-icons';
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

        <span className="col-start-1 row-start-2 text-xl leading-none font-bold text-muted-foreground">
          {form.fromDisplay}
        </span>

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

        <FieldError className="col-start-3 col-end-5 row-start-3">{form.positionError}</FieldError>
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
    </div>
  );
}

function useProgressLogForm(engagement: EngagementRead, onClose: () => void) {
  const isAudio = engagement.formats.includes(Format.audio);
  const fromValue = isAudio ? engagement.resume_from_minute : engagement.resume_from_page;
  const fromDisplay = formatPosition(fromValue, isAudio);

  const [position, setPositionRaw] = useState('');
  const [positionFocused, setPositionFocused] = useState(false);
  const [dateEditorOpen, setDateEditorOpen] = useState(false);
  const [date, setDateRaw] = useState(localIsoDate);
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

  function pickDate(value: string) {
    setDateRaw(value);
    setDateSource('chip');
    setError(null);
    setDateEditorOpen(false);
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

  const parsedPosition = parsePosition(position, isAudio);

  const maxPosition = isAudio ? engagement.length_minutes : engagement.length_pages;
  const maxDisplay = maxPosition == null ? null : formatPosition(maxPosition, isAudio);
  const canSave =
    parsedPosition !== null &&
    parsedPosition >= fromValue &&
    (maxPosition == null || parsedPosition <= maxPosition);

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
