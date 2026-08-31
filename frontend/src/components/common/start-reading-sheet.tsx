import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQueryClient } from '@tanstack/react-query';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { getBooksListBookEngagementsQueryKey } from '@/api/generated/books/books';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsCreateEngagement,
} from '@/api/generated/engagements/engagements';
import {
  EngagementCreateStatus,
  Format,
  type BookRead,
} from '@/api/generated/readingTracker.schemas';
import { ErrorText } from '@/components/common/error-text';
import { PositionInput } from '@/components/common/position-input';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
import { formatLength, lengthField, parseLength } from '@/utils/length';
import { localIsoDate } from '@/utils/local-date';
import { STATUSES } from '@/utils/status';

const READING_ONLY = [EngagementCreateStatus.reading];

type StartReadingSheetProps = {
  book: BookRead;
  // More than one turns the sheet into two steps, asking where the read goes before
  // asking how it was read. One (the default) goes straight to the form.
  statuses?: EngagementCreateStatus[];
  cancelLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where a started read belongs next is the caller's call: the catalog sends you to the
  // Reading shelf, the book page leaves you on the book you just picked up again.
  onStarted?: () => void;
};

export function StartReadingSheet({ open, onOpenChange, ...props }: StartReadingSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <StartReadingForm {...props} onDone={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

type StartReadingFormProps = Omit<StartReadingSheetProps, 'open' | 'onOpenChange'> & {
  onDone: () => void;
};

function StartReadingForm({
  book,
  statuses = READING_ONLY,
  cancelLabel = 'Cancel',
  onDone,
  onStarted,
}: StartReadingFormProps) {
  const form = useStartReadingForm(book, statuses, onDone, onStarted);

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{book.title}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {form.step === 'status'
            ? 'Where does it go?'
            : form.isReading
              ? 'How are you reading it?'
              : 'How did you read it?'}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      {form.step === 'status' ? (
        <>
          <ResponsiveDialogBody>
            <div className="flex flex-col gap-2">
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  className="justify-start"
                  aria-label={`Add ${book.title} as ${STATUSES[status].label}`}
                  onClick={() => form.pickStatus(status)}
                >
                  {STATUSES[status].label}
                </Button>
              ))}
            </div>
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={onDone}>
              {cancelLabel}
            </Button>
          </ResponsiveDialogFooter>
        </>
      ) : (
        <StartReadingFields form={form} book={book} cancelLabel={cancelLabel} onDone={onDone} />
      )}
    </>
  );
}

function StartReadingFields({
  form,
  book,
  cancelLabel,
  onDone,
}: {
  form: ReturnType<typeof useStartReadingForm>;
  book: BookRead;
  cancelLabel: string;
  onDone: () => void;
}) {
  return (
    <>
      <ResponsiveDialogBody>
        <div role="group" aria-label="Format" className="flex flex-col gap-2">
          {Object.values(Format).map((format) => (
            <Button
              key={format}
              variant={form.format === format ? 'default' : 'outline'}
              className="justify-start"
              aria-pressed={form.format === format}
              disabled={form.startPending}
              onClick={() => form.pickFormat(format)}
            >
              <HugeiconsIcon icon={FORMATS[format].icon} data-icon="inline-start" />
              {FORMATS[format].label}
            </Button>
          ))}
        </div>

        <Field data-invalid={!!form.lengthError}>
          <FieldLabel htmlFor="start-reading-length">{form.lengthLabel}</FieldLabel>
          <PositionInput
            id="start-reading-length"
            isAudio={form.isAudio}
            value={form.length}
            onValueChange={form.setLength}
            onFocus={() => form.setLengthFocused(true)}
            onBlur={() => form.setLengthFocused(false)}
            aria-invalid={!!form.lengthError}
            {...(form.lengthPlaceholder && { placeholder: form.lengthPlaceholder })}
          />
          <FieldDescription>
            {form.lengthRequired
              ? "We don't have a length for this one yet, so it needs one."
              : "If your edition doesn't match, enter its length."}
          </FieldDescription>
          <FieldError>{form.lengthError}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="start-reading-date">Start date</FieldLabel>
          <Input
            id="start-reading-date"
            type="date"
            max={localIsoDate()}
            value={form.startedOn}
            onChange={(event) => form.setStartedOn(event.target.value)}
          />
          {!form.isReading && (
            <FieldDescription>Leave either date blank if you don't know it.</FieldDescription>
          )}
        </Field>

        {!form.isReading && (
          <Field>
            <FieldLabel htmlFor="start-reading-finish-date">{form.finishLabel}</FieldLabel>
            <Input
              id="start-reading-finish-date"
              type="date"
              max={localIsoDate()}
              value={form.finishedOn}
              onChange={(event) => form.setFinishedOn(event.target.value)}
            />
          </Field>
        )}

        {form.error && <ErrorText>{form.error}</ErrorText>}
      </ResponsiveDialogBody>

      <ResponsiveDialogFooter>
        <Button variant="outline" disabled={form.startPending} onClick={onDone}>
          {cancelLabel}
        </Button>
        <Button
          disabled={!form.canStart || form.startPending}
          aria-label={`${form.submitLabel} ${book.title}`}
          onClick={form.handleStart}
        >
          {form.submitLabel}
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

// A read in progress starts today unless you say otherwise. One logged after the fact
// starts blank -- prefilling today would record a date you never claimed.
function defaultStartedOn(status: EngagementCreateStatus) {
  return status === EngagementCreateStatus.reading ? localIsoDate() : '';
}

function useStartReadingForm(
  book: BookRead,
  statuses: EngagementCreateStatus[],
  onClose: () => void,
  onStarted?: () => void
) {
  const [status, setStatus] = useState(statuses[0]!);
  const [step, setStep] = useState<'status' | 'fields'>(statuses.length > 1 ? 'status' : 'fields');
  const [format, setFormat] = useState<Format>(Format.print);
  const [length, setLengthRaw] = useState('');
  const [lengthFocused, setLengthFocused] = useState(false);
  const [startedOn, setStartedOn] = useState(defaultStartedOn(statuses[0]!));
  const [finishedOn, setFinishedOn] = useState('');
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const createEngagement = useEngagementsCreateEngagement<DetailError>({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getBooksListBookEngagementsQueryKey(book.id) }),
        ]);
        onClose();
        onStarted?.();
      },
      onError: (err) => {
        setError(errorDetail(err, 'Failed to start this read. Please try again.'));
      },
    },
  });

  const isAudio = format === Format.audio;
  const knownLength = isAudio ? book.default_audio_minutes : book.default_page_count;
  const typed = length.trim() !== '';
  const parsedLength = parseLength(isAudio, length);

  function setLength(value: string) {
    setLengthRaw(value);
    setError(null);
  }

  function pickFormat(picked: Format) {
    if (picked === format) return;
    setFormat(picked);
    setLengthRaw('');
    setError(null);
  }

  function pickStatus(picked: EngagementCreateStatus) {
    setStatus(picked);
    setStartedOn(defaultStartedOn(picked));
    setStep('fields');
  }

  function handleStart() {
    if (typed && parsedLength === null) return;
    setError(null);
    createEngagement.mutate({
      data: {
        book_id: book.id,
        edition_format: format,
        status,
        ...(startedOn && { started_on: startedOn }),
        ...(finishedOn && { finished_on: finishedOn }),
        ...(typed && parsedLength !== null && lengthField(knownLength, parsedLength)),
      },
    });
  }

  const lengthError =
    !lengthFocused && typed && parsedLength === null
      ? isAudio
        ? 'Enter a length in HH:MM format'
        : 'Enter a number of pages'
      : null;

  const isReading = status === EngagementCreateStatus.reading;

  return {
    step,
    pickStatus,
    isReading,
    submitLabel: isReading ? 'Start reading' : 'Add',
    finishLabel: status === EngagementCreateStatus.dnf ? 'Stopped on' : 'Finish date',
    finishedOn,
    setFinishedOn,
    format,
    pickFormat,
    isAudio,
    length,
    setLength,
    setLengthFocused,
    lengthLabel: isAudio ? 'Length' : 'Pages',
    lengthPlaceholder: knownLength === null ? null : formatLength(isAudio, knownLength),
    lengthRequired: knownLength === null,
    lengthError,
    startedOn,
    setStartedOn,
    canStart: typed ? parsedLength !== null : knownLength !== null,
    handleStart,
    error,
    startPending: createEngagement.isPending,
  };
}
