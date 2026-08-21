import { useState } from 'react';
import { useNavigate } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQueryClient } from '@tanstack/react-query';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { getBooksListBookEngagementsQueryKey } from '@/api/generated/books/books';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsCreateEngagement,
} from '@/api/generated/engagements/engagements';
import { Format, type BookRead } from '@/api/generated/readingTracker.schemas';
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
import { formatMinutesAsHhmm, parseHhmmToMinutes } from '@/utils/format-minutes';
import { localIsoDate } from '@/utils/local-date';
import { STATUSES } from '@/utils/status';

type StartReadingSheetProps = {
  book: BookRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StartReadingSheet({ book, open, onOpenChange }: StartReadingSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <StartReadingForm book={book} onDone={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function StartReadingForm({ book, onDone }: { book: BookRead; onDone: () => void }) {
  const form = useStartReadingForm(book, onDone);

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{book.title}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>How are you reading it?</ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

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
        </Field>

        {form.error && <ErrorText>{form.error}</ErrorText>}
      </ResponsiveDialogBody>

      <ResponsiveDialogFooter>
        <Button variant="outline" disabled={form.startPending} onClick={onDone}>
          Cancel
        </Button>
        <Button
          disabled={!form.canStart || form.startPending}
          aria-label={`Start reading ${book.title}`}
          onClick={form.handleStart}
        >
          Start reading
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

function useStartReadingForm(book: BookRead, onClose: () => void) {
  const [format, setFormat] = useState<Format>(Format.print);
  const [length, setLengthRaw] = useState('');
  const [lengthFocused, setLengthFocused] = useState(false);
  const [startedOn, setStartedOn] = useState(localIsoDate());
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createEngagement = useEngagementsCreateEngagement<DetailError>({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getBooksListBookEngagementsQueryKey(book.id) }),
        ]);
        onClose();
        navigate(STATUSES.reading.to);
      },
      onError: (err) => {
        setError(errorDetail(err, 'Failed to start this read. Please try again.'));
      },
    },
  });

  const isAudio = format === Format.audio;
  // The book's per-format default is the last link of the ADR-0021 length chain, and the
  // only one the catalog list payload carries. An edition corrected away from it shows a
  // slightly stale hint; typing over the hint makes an override either way.
  const knownLength = isAudio ? book.default_audio_minutes : book.default_page_count;
  const typed = length.trim() !== '';
  const parsedLength = isAudio ? parseHhmmToMinutes(length) : parsePages(length);

  function setLength(value: string) {
    setLengthRaw(value);
    setError(null);
  }

  function pickFormat(picked: Format) {
    if (picked === format) return;
    setFormat(picked);
    // Pages and minutes aren't interchangeable, so a length typed for the old format
    // can't carry over to the new one.
    setLengthRaw('');
    setError(null);
  }

  function handleStart() {
    if (typed && parsedLength === null) return;
    setError(null);
    createEngagement.mutate({
      data: {
        book_id: book.id,
        edition_format: format,
        status: 'reading',
        started_on: startedOn,
        ...(typed && parsedLength !== null && lengthField(isAudio, knownLength, parsedLength)),
      },
    });
  }

  const lengthError =
    !lengthFocused && typed && parsedLength === null
      ? isAudio
        ? 'Enter a length in HH:MM format'
        : 'Enter a number of pages'
      : null;

  return {
    format,
    pickFormat,
    isAudio,
    length,
    setLength,
    setLengthFocused,
    lengthLabel: isAudio ? 'Length' : 'Pages',
    lengthPlaceholder:
      knownLength === null
        ? null
        : isAudio
          ? formatMinutesAsHhmm(knownLength)
          : String(knownLength),
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

function parsePages(value: string): number | null {
  const trimmed = value.trim();
  return /^\d+$/.test(trimmed) && Number(trimmed) > 0 ? Number(trimmed) : null;
}

// An audio length is the first one this book has ever had, so it's a fact about the audio
// edition and gets captured there (ADR-0022). Every other length is a correction to one
// that already exists, which belongs to this read alone as a binding override (ADR-0021).
function lengthField(isAudio: boolean, knownLength: number | null, value: number) {
  return isAudio && knownLength === null
    ? { audio_length_minutes: value }
    : { length_override: value };
}
