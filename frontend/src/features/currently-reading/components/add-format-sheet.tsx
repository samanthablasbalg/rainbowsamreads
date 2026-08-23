import { useState, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { getBooksListBookEngagementsQueryKey } from '@/api/generated/books/books';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsCreateBinding,
} from '@/api/generated/engagements/engagements';
import { Format, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { CoverImage } from '@/components/common/cover-image';
import { ErrorText } from '@/components/common/error-text';
import { PositionInput } from '@/components/common/position-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { cn } from '@/lib/utils';
import { authorNames, coverSrc, formatPageCount } from '@/utils/book';
import { FORMATS } from '@/utils/format';
import { formatLength, lengthField, parseLength } from '@/utils/length';

type AddFormatSheetProps = {
  engagement: EngagementRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddFormatSheet({ engagement, open, onOpenChange }: AddFormatSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <AddFormatForm engagement={engagement} onDone={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function AddFormatForm({ engagement, onDone }: { engagement: EngagementRead; onDone: () => void }) {
  const form = useAddFormatForm(engagement, onDone);

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Add another format</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Read it in more than one edition at once. Progress stays one book.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <ResponsiveDialogBody>
        <div className="flex items-center gap-3">
          <CoverImage
            src={coverSrc(engagement)}
            title={engagement.book.title}
            className="h-16 w-11"
          />
          <div className="min-w-0">
            <p className="font-heading font-semibold">{engagement.book.title}</p>
            <p className="text-sm text-muted-foreground">{authorNames(engagement.book)}</p>
          </div>
        </div>

        {/* Every format is listed, bound ones included: seeing what you're already in, and
            where you are in it, is what tells you what adding another one means. */}
        <div role="group" aria-label="Format" className="-mx-1">
          {Object.values(Format).map((format) =>
            engagement.formats.includes(format) ? (
              <FormatRow key={format} format={format} detail={boundDetail(engagement, format)}>
                <Badge className="bg-brand-orange text-brand-orange-foreground uppercase">
                  Reading
                </Badge>
              </FormatRow>
            ) : (
              <FormatRow
                key={format}
                format={format}
                detail={knownLengthLabel(engagement, format) ?? 'Length unknown'}
                selected={form.format === format}
                disabled={form.addPending}
                onSelect={() => form.pickFormat(format)}
              >
                {form.format === format ? (
                  <HugeiconsIcon icon={Tick02Icon} className="size-5 text-primary" />
                ) : (
                  <Badge variant="outline">Add</Badge>
                )}
              </FormatRow>
            )
          )}
        </div>

        {/* Nothing is picked to begin with -- the list is what you came here to read, and a
            length for a format you haven't chosen has nothing to attach to. */}
        {form.format !== null && (
          <Field data-invalid={!!form.lengthError}>
            <FieldLabel htmlFor="add-format-length">{form.lengthLabel}</FieldLabel>
            <PositionInput
              id="add-format-length"
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
        )}

        {form.error && <ErrorText>{form.error}</ErrorText>}
      </ResponsiveDialogBody>

      <ResponsiveDialogFooter>
        <Button variant="outline" disabled={form.addPending} onClick={onDone}>
          Cancel
        </Button>
        <Button disabled={!form.canAdd || form.addPending} onClick={form.handleAdd}>
          Add format
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

// A list row, not a Button: the rows are one list whether or not they can be picked, and
// Button's fixed-height pill is the wrong primitive for a two-line row with a trailing chip.
const ROW = 'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm';

function FormatRow({
  format,
  detail,
  selected,
  disabled,
  onSelect,
  children,
}: {
  format: Format;
  detail: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  children?: ReactNode;
}) {
  const body = (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        <HugeiconsIcon icon={FORMATS[format].icon} className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold">{FORMATS[format].label}</span>
        <span className="text-xs text-muted-foreground">{detail}</span>
      </span>
      <span className="ml-auto">{children}</span>
    </>
  );

  if (!onSelect) {
    return <div className={ROW}>{body}</div>;
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        ROW,
        'transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
        selected ? 'bg-primary/10' : 'hover:bg-muted/50'
      )}
    >
      {body}
    </button>
  );
}

function boundDetail(engagement: EngagementRead, format: Format): string {
  const isAudio = format === Format.audio;
  const position = isAudio ? engagement.resume_from_minute : engagement.resume_from_page;
  const where =
    position === 0
      ? 'nothing logged yet'
      : `at ${isAudio ? formatLength(true, position) : `p. ${position}`}`;
  const length = boundLengthLabel(engagement, format);
  return length ? `${length} · ${where}` : where;
}

function useAddFormatForm(engagement: EngagementRead, onClose: () => void) {
  const [format, setFormat] = useState<Format | null>(null);
  const [length, setLengthRaw] = useState('');
  const [lengthFocused, setLengthFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const createBinding = useEngagementsCreateBinding<DetailError>({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() }),
          queryClient.invalidateQueries({
            queryKey: getBooksListBookEngagementsQueryKey(engagement.book.id),
          }),
        ]);
        onClose();
      },
      onError: (err) => {
        setError(errorDetail(err, 'Failed to add this format. Please try again.'));
      },
    },
  });

  const isAudio = format === Format.audio;
  // The book's per-format default is the last link of the ADR-0021 length chain. This read
  // already has a length for the format it is bound in, but the one being added has never
  // been sized here, so the book's default is all there is to offer.
  const knownLength = format === null ? null : knownLengthFor(engagement, format);
  const typed = length.trim() !== '';
  const parsedLength = parseLength(isAudio, length);

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

  function handleAdd() {
    if (format === null || (typed && parsedLength === null)) return;
    setError(null);
    createBinding.mutate({
      engagementId: engagement.id,
      data: {
        edition_format: format,
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
    lengthPlaceholder: knownLength === null ? null : formatLength(isAudio, knownLength),
    lengthRequired: knownLength === null,
    lengthError,
    canAdd: format !== null && (typed ? parsedLength !== null : knownLength !== null),
    handleAdd,
    error,
    addPending: createBinding.isPending,
  };
}

function knownLengthFor(engagement: EngagementRead, format: Format): number | null {
  return format === Format.audio
    ? engagement.book.default_audio_minutes
    : engagement.book.default_page_count;
}

function knownLengthLabel(engagement: EngagementRead, format: Format): string | null {
  return lengthLabel(format === Format.audio, knownLengthFor(engagement, format));
}

// A bound format's length is this read's own, not the book's: the binding may override it.
function boundLengthLabel(engagement: EngagementRead, format: Format): string | null {
  const isAudio = format === Format.audio;
  return lengthLabel(isAudio, isAudio ? engagement.length_minutes : engagement.length_pages);
}

function lengthLabel(isAudio: boolean, value: number | null): string | null {
  if (value === null) return null;
  return isAudio ? formatLength(true, value) : formatPageCount(value);
}
