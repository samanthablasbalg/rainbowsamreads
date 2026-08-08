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
import { Format, ReadingStatus, type BookRead } from '@/api/generated/readingTracker.schemas';
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

const FORMATS: { format: Format; label: string; icon: IconSvgElement }[] = [
  { format: Format.print, label: 'Print', icon: BookOpen01Icon },
  { format: Format.digital, label: 'Digital', icon: Tablet01Icon },
  { format: Format.audio, label: 'Audio', icon: HeadphonesIcon },
];

type FormatPickSheetProps = {
  book: BookRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Starting a read needs a format, because that is what picks the edition the engagement
// binds to. Every book carries all three ([[0022-seed-three-editions-per-book]]), so all
// three are always offered -- there is no list-editions-for-a-book endpoint, and nothing
// on BookRead says which exist, so a book missing one surfaces as the backend's 404
// rather than a greyed-out button.
//
// Same split as ProgressLogSheet, for the same reason: the step and the typed length
// live in a component rendered below ResponsiveDialogContent, inside a portal that
// unmounts on close. Held above that line they would belong to CatalogRow, which never
// unmounts, and a reopened picker would still be sitting on the audio step.
export function FormatPickSheet({ book, open, onOpenChange }: FormatPickSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <FormatPickForm book={book} onDone={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function FormatPickForm({ book, onDone }: { book: BookRead; onDone: () => void }) {
  const form = useFormatPickForm(book, onDone);

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{book.title}</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          {form.needsAudioLength
            ? 'Audiobook lengths vary by narration.'
            : 'How are you reading it?'}
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      {form.needsAudioLength ? (
        <AudioLengthField form={form} />
      ) : (
        <div className="flex flex-col gap-2">
          {FORMATS.map(({ format, label, icon }) => (
            <Button
              key={format}
              variant="outline"
              className="justify-start"
              disabled={form.startPending}
              aria-label={`Start reading ${book.title} as ${label}`}
              onClick={() => form.pickFormat(format)}
            >
              <HugeiconsIcon icon={icon} data-icon="inline-start" />
              {label}
            </Button>
          ))}
        </div>
      )}

      {form.error && <p role="alert">{form.error}</p>}

      {/* Back rather than a third button: it returns to the format list, which is where
          Cancel lives, so the length step never has to carry both. */}
      <ResponsiveDialogFooter>
        {form.needsAudioLength ? (
          <>
            <Button variant="outline" disabled={form.startPending} onClick={form.goBack}>
              <HugeiconsIcon icon={ArrowLeft01Icon} data-icon="inline-start" />
              Back
            </Button>
            <Button
              disabled={!form.canStart || form.startPending}
              aria-label={`Start reading ${book.title} as Audio`}
              onClick={form.handleStart}
            >
              Start reading
            </Button>
          </>
        ) : (
          <Button variant="outline" disabled={form.startPending} onClick={onDone}>
            Cancel
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

function useFormatPickForm(book: BookRead, onClose: () => void) {
  // Set only when Audio is picked without a stored length -- the one case that gets a
  // second step. Print and digital are measured in pages, and EngagementCreate has no
  // page field to send one in, so they always start immediately.
  const [pendingAudio, setPendingAudio] = useState(false);
  const [length, setLengthRaw] = useState('');
  const [lengthFocused, setLengthFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createEngagement = useEngagementsCreateEngagement<ErrorType<{ detail?: string }>>({
    mutation: {
      // The catalog itself does not change -- a book stays in it once read -- so only
      // the reading list is invalidated, and it is the list being navigated to.
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getEngagementsListEngagementsQueryKey({ status: ReadingStatus.reading }),
        });
        onClose();
        navigate('/home');
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

  function start(format: Format, audioLengthMinutes?: number) {
    setError(null);
    createEngagement.mutate({
      data: {
        book_id: book.id,
        edition_format: format,
        ...(audioLengthMinutes != null && { audio_length_minutes: audioLengthMinutes }),
      },
    });
  }

  function pickFormat(format: Format) {
    if (format === Format.audio && book.default_audio_minutes == null) {
      setPendingAudio(true);
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
    setPendingAudio(false);
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
    needsAudioLength: pendingAudio,
    length,
    setLength,
    setLengthFocused,
    lengthError,
    canStart: parsedLength !== null,
    pickFormat,
    handleStart,
    goBack,
    error,
    startPending: createEngagement.isPending,
  };
}
