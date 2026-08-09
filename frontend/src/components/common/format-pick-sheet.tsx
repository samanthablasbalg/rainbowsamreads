import { useState } from 'react';
import { useNavigate } from 'react-router';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  BookOpen01Icon,
  HeadphonesIcon,
  Tablet01Icon,
} from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { ErrorType } from '@/api/mutator/axios-instance';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsCreateEngagement,
} from '@/api/generated/engagements/engagements';
import { EngagementCreateStatus, Format } from '@/api/generated/readingTracker.schemas';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { parseHhmmToMinutes } from '@/utils/format-minutes';
import { localIsoDate } from '@/utils/local-date';

const FORMATS: { format: Format; label: string; icon: IconSvgElement }[] = [
  { format: Format.print, label: 'Print', icon: BookOpen01Icon },
  { format: Format.digital, label: 'Digital', icon: Tablet01Icon },
  { format: Format.audio, label: 'Audio', icon: HeadphonesIcon },
];

const STATUS_LABEL: Record<EngagementCreateStatus, string> = {
  reading: 'Reading',
  finished: 'Finished',
  dnf: 'DNF',
};

// Where a finished sheet lands you. The status decides it, so the caller does not pass a
// destination -- the catalog only ever creates `reading` and so still ends up on /home.
const DESTINATION: Record<EngagementCreateStatus, string> = {
  reading: '/home',
  finished: '/library/finished',
  dnf: '/library/dnf',
};

function pickLabel(status: EngagementCreateStatus, title: string, format: string): string {
  return status === EngagementCreateStatus.reading
    ? `Start reading ${title} as ${format}`
    : `Add ${title} as ${STATUS_LABEL[status]} in ${format}`;
}

export type FormatPickSheetProps = {
  bookId: string;
  title: string;
  // Null means "not known", not "no audiobook" -- it only decides whether picking Audio
  // has to stop and ask for a length. A search result never carries one, so that path
  // always asks.
  audioMinutes: number | null;
  // More than one and the sheet opens on a status step; fewer skips straight to format
  // and uses the single status, defaulting to `reading`.
  statuses?: EngagementCreateStatus[];
  cancelLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Starting a read needs a format, because that is what picks the edition the engagement
// binds to. Every book carries all three ([[0022-seed-three-editions-per-book]]), so all
// three are always offered -- there is no list-editions-for-a-book endpoint, and nothing
// says which exist, so a book missing one surfaces as the backend's 404 rather than a
// greyed-out button.
//
// Takes the fields it needs rather than a `BookRead`: search opens this off a
// `BookSearchResult`, which is a different shape and has no way to become one.
//
// Same split as ProgressLogSheet, for the same reason: the step and the typed length
// live in a component rendered below ResponsiveDialogContent, inside a portal that
// unmounts on close. Held above that line they would belong to the caller, which never
// unmounts, and a reopened picker would still be sitting on the audio step.
export function FormatPickSheet({ open, onOpenChange, ...props }: FormatPickSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <FormatPickForm {...props} onDone={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

type FormatPickFormProps = Omit<FormatPickSheetProps, 'open' | 'onOpenChange'> & {
  onDone: () => void;
};

function FormatPickForm({ cancelLabel = 'Cancel', onDone, ...props }: FormatPickFormProps) {
  const { title, statuses } = props;
  const form = useFormatPickForm(props, onDone);

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {form.step === 'length'
            ? 'Audiobook lengths vary by narration.'
            : form.step === 'status'
              ? 'Where does it go?'
              : form.status === EngagementCreateStatus.reading
                ? 'How are you reading it?'
                : 'How did you read it?'}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      {form.step === 'status' && (
        <div className="flex flex-col gap-2">
          {statuses?.map((status) => (
            <Button
              key={status}
              variant="outline"
              className="justify-start"
              aria-label={`Add ${title} as ${STATUS_LABEL[status]}`}
              onClick={() => form.pickStatus(status)}
            >
              {STATUS_LABEL[status]}
            </Button>
          ))}
        </div>
      )}

      {form.step === 'format' && (
        <div className="flex flex-col gap-2">
          {FORMATS.map(({ format, label, icon }) => (
            <Button
              key={format}
              variant="outline"
              className="justify-start"
              disabled={form.startPending}
              aria-label={pickLabel(form.status, title, label)}
              onClick={() => form.pickFormat(format)}
            >
              <HugeiconsIcon icon={icon} data-icon="inline-start" />
              {label}
            </Button>
          ))}
        </div>
      )}

      {form.step === 'length' && <AudioLengthField form={form} />}

      {form.error && <p role="alert">{form.error}</p>}

      {/* Back rather than a third button: it returns to the format list, which is where
          Cancel lives, so the length step never has to carry both. */}
      <ResponsiveDialogFooter>
        {form.step === 'length' ? (
          <>
            <Button variant="outline" disabled={form.startPending} onClick={form.goBack}>
              <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
              Back
            </Button>
            <Button
              disabled={!form.canStart || form.startPending}
              aria-label={pickLabel(form.status, title, 'Audio')}
              onClick={form.handleStart}
            >
              {form.status === EngagementCreateStatus.reading ? 'Start reading' : 'Add'}
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled={form.startPending} onClick={onDone}>
            {cancelLabel}
          </Button>
        )}
      </ResponsiveDialogFooter>
    </>
  );
}

// HH:MM rather than raw minutes, matching how a player reports a book's length and how
// ProgressLogSheet takes an audio position -- one typing convention for both.
function AudioLengthField({ form }: { form: ReturnType<typeof useFormatPickForm> }) {
  return (
    <Field data-invalid={!!form.lengthError}>
      <FieldLabel htmlFor="audio-length">How long is the audiobook?</FieldLabel>
      <Input
        id="audio-length"
        type="text"
        inputMode="numeric"
        placeholder="--:--"
        value={form.length}
        onChange={(event) => form.setLength(event.target.value)}
        onFocus={() => form.setLengthFocused(true)}
        onBlur={() => form.setLengthFocused(false)}
        aria-invalid={!!form.lengthError}
      />
      <FieldError>{form.lengthError}</FieldError>
    </Field>
  );
}

function useFormatPickForm(
  { bookId, audioMinutes, statuses }: Omit<FormatPickFormProps, 'onDone'>,
  onClose: () => void
) {
  // A status step only when there is a choice to make. Below that the status is fixed
  // from the moment the sheet opens, which is why it is state seeded once rather than
  // something the format step recomputes.
  const [status, setStatus] = useState<EngagementCreateStatus>(
    statuses?.[0] ?? EngagementCreateStatus.reading
  );
  const [step, setStep] = useState<'status' | 'format' | 'length'>(
    (statuses?.length ?? 0) > 1 ? 'status' : 'format'
  );
  const [length, setLengthRaw] = useState('');
  const [lengthFocused, setLengthFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createEngagement = useEngagementsCreateEngagement<ErrorType<{ detail?: string }>>({
    mutation: {
      // The catalog itself does not change -- a book stays in it once read -- so only
      // the engagement lists are invalidated. No params: that is the prefix of every
      // per-status list key, and the status picked here decides which one is stale.
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getEngagementsListEngagementsQueryKey(),
        });
        onClose();
        navigate(DESTINATION[status]);
      },
      onError: (err) => {
        setError(err.response?.data?.detail ?? 'Failed to start this read. Please try again.');
      },
    },
  });

  function setLength(value: string) {
    setLengthRaw(value);
    setError(null);
  }

  const parsedLength = parseHhmmToMinutes(length);

  // `started_on` is sent rather than left to the backend's fallback: per ADR-0024 § 3
  // every `_on` business date comes from the client's local day, and the server's own
  // date is a calendar day ahead for an evening read anywhere behind UTC.
  function start(format: Format, audioLengthMinutes?: number) {
    setError(null);
    createEngagement.mutate({
      data: {
        book_id: bookId,
        edition_format: format,
        status,
        started_on: localIsoDate(),
        ...(audioLengthMinutes != null && { audio_length_minutes: audioLengthMinutes }),
      },
    });
  }

  function pickStatus(picked: EngagementCreateStatus) {
    setStatus(picked);
    setStep('format');
  }

  function pickFormat(format: Format) {
    // Set only when Audio is picked without a stored length -- the one case that gets a
    // third step. Print and digital are measured in pages, and EngagementCreate has no
    // page field to send one in, so they always start immediately.
    if (format === Format.audio && audioMinutes == null) {
      setStep('length');
      return;
    }
    start(format);
  }

  function handleStart() {
    if (parsedLength === null) return;
    start(Format.audio, parsedLength);
  }

  // Drops the typed length as well as the step, so coming back to Audio starts from an
  // empty field rather than whatever the last attempt left there.
  function goBack() {
    setStep('format');
    setLengthRaw('');
    setLengthFocused(false);
    setError(null);
  }

  // Held back while the field has focus so a half-typed "1" on the way to "10:00" does
  // not flash an error, and while it is empty -- the button is already disabled, and an
  // untouched field has nothing to complain about.
  const lengthError =
    !lengthFocused && length.trim() !== '' && parsedLength === null
      ? 'Enter a length in HH:MM format'
      : null;

  return {
    step,
    status,
    length,
    setLength,
    setLengthFocused,
    lengthError,
    canStart: parsedLength !== null,
    pickStatus,
    pickFormat,
    handleStart,
    goBack,
    error,
    startPending: createEngagement.isPending,
  };
}
