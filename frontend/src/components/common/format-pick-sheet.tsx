import { useState } from 'react';
import { useNavigate } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { getBooksListBookEngagementsQueryKey } from '@/api/generated/books/books';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsCreateEngagement,
} from '@/api/generated/engagements/engagements';
import { EngagementCreateStatus, Format } from '@/api/generated/readingTracker.schemas';
import { ErrorText } from '@/components/common/error-text';
import { HhmmInput } from '@/components/common/hhmm-input';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { FORMATS } from '@/utils/format';
import { parseHhmmToMinutes } from '@/utils/format-minutes';
import { localIsoDate } from '@/utils/local-date';
import { STATUSES } from '@/utils/status';

function pickLabel(status: EngagementCreateStatus, title: string, format: string): string {
  return status === EngagementCreateStatus.reading
    ? `Start reading ${title} as ${format}`
    : `Add ${title} as ${STATUSES[status].label} in ${format}`;
}

export type FormatPickSheetProps = {
  bookId: string;
  title: string;
  audioMinutes: number | null;
  statuses?: EngagementCreateStatus[];
  cancelLabel?: string;
  redirectOnCreate?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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

      <ResponsiveDialogBody>
        {form.step === 'status' && (
          <div className="flex flex-col gap-2">
            {statuses?.map((status) => (
              <Button
                key={status}
                variant="outline"
                className="justify-start"
                aria-label={`Add ${title} as ${STATUSES[status].label}`}
                onClick={() => form.pickStatus(status)}
              >
                {STATUSES[status].label}
              </Button>
            ))}
          </div>
        )}

        {form.step === 'format' && (
          <div className="flex flex-col gap-2">
            {Object.values(Format).map((format) => (
              <Button
                key={format}
                variant="outline"
                className="justify-start"
                disabled={form.startPending}
                aria-label={pickLabel(form.status, title, FORMATS[format].label)}
                onClick={() => form.pickFormat(format)}
              >
                <HugeiconsIcon icon={FORMATS[format].icon} data-icon="inline-start" />
                {FORMATS[format].label}
              </Button>
            ))}
          </div>
        )}

        {form.step === 'length' && <AudioLengthField form={form} />}

        {form.error && <ErrorText>{form.error}</ErrorText>}
      </ResponsiveDialogBody>

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

function AudioLengthField({ form }: { form: ReturnType<typeof useFormatPickForm> }) {
  return (
    <Field data-invalid={!!form.lengthError}>
      <FieldLabel htmlFor="audio-length">How long is the audiobook?</FieldLabel>
      <HhmmInput
        id="audio-length"
        value={form.length}
        onValueChange={form.setLength}
        onFocus={() => form.setLengthFocused(true)}
        onBlur={() => form.setLengthFocused(false)}
        aria-invalid={!!form.lengthError}
      />
      <FieldError>{form.lengthError}</FieldError>
    </Field>
  );
}

function useFormatPickForm(
  { bookId, audioMinutes, statuses, redirectOnCreate = true }: Omit<FormatPickFormProps, 'onDone'>,
  onClose: () => void
) {
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

  const createEngagement = useEngagementsCreateEngagement<DetailError>({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() }),
          queryClient.invalidateQueries({
            queryKey: getBooksListBookEngagementsQueryKey(bookId),
          }),
        ]);
        onClose();
        if (redirectOnCreate) {
          navigate(STATUSES[status].to);
        }
      },
      onError: (err) => {
        setError(errorDetail(err, 'Failed to start this read. Please try again.'));
      },
    },
  });

  function setLength(value: string) {
    setLengthRaw(value);
    setError(null);
  }

  const parsedLength = parseHhmmToMinutes(length);

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

  function goBack() {
    setStep('format');
    setLengthRaw('');
    setLengthFocused(false);
    setError(null);
  }

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
