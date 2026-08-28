import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { useQueryClient } from '@tanstack/react-query';
import { errorDetail, type DetailError } from '@/api/error-detail';
import { getBooksListBookEngagementsQueryKey } from '@/api/generated/books/books';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsUpdateEngagementStatus,
} from '@/api/generated/engagements/engagements';
import {
  EngagementStatusUpdateStatus,
  Format,
  LogUnit,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { CoverImage } from '@/components/common/cover-image';
import { ErrorText } from '@/components/common/error-text';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
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
import { authorNames, coverSrc } from '@/utils/book';
import { FORMATS } from '@/utils/format';
import { localIsoDate } from '@/utils/local-date';

type FinishReadSheetProps = {
  engagement: EngagementRead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FinishReadSheet({ engagement, open, onOpenChange }: FinishReadSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <FinishReadForm engagement={engagement} onDone={() => onOpenChange(false)} />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function FinishReadForm({
  engagement,
  onDone,
}: {
  engagement: EngagementRead;
  onDone: () => void;
}) {
  const form = useFinishReadForm(engagement, onDone);

  return (
    <>
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>Mark as finished</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Finishing writes a closing entry that runs out the rest of the book.
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

        {/* Two rulers bound means two answers to "the rest of what", and no way to tell
            them apart from here -- so this asks rather than picking one. */}
        {form.unitSwitchFormat && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Which format did you finish it in?</p>
            <div
              role="group"
              aria-label="Closing entry format"
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                variant={form.unit === LogUnit.pages ? 'default' : 'outline'}
                aria-pressed={form.unit === LogUnit.pages}
                size="sm"
                disabled={form.finishPending}
                onClick={() => form.pickUnit(LogUnit.pages)}
              >
                <HugeiconsIcon
                  icon={FORMATS[form.unitSwitchFormat].icon}
                  data-icon="inline-start"
                />
                Pages
              </Button>
              <Button
                variant={form.unit === LogUnit.minutes ? 'default' : 'outline'}
                aria-pressed={form.unit === LogUnit.minutes}
                size="sm"
                disabled={form.finishPending}
                onClick={() => form.pickUnit(LogUnit.minutes)}
              >
                <HugeiconsIcon icon={FORMATS[Format.audio].icon} data-icon="inline-start" />
                Minutes
              </Button>
            </div>
          </div>
        )}

        <Field>
          <FieldLabel htmlFor="finish-read-date">Finish date</FieldLabel>
          <Input
            id="finish-read-date"
            type="date"
            max={localIsoDate()}
            value={form.finishedOn}
            onChange={(event) => form.setFinishedOn(event.target.value)}
          />
          <FieldDescription>
            Defaults to today. It can't be before your last entry.
          </FieldDescription>
        </Field>

        {form.error && <ErrorText>{form.error}</ErrorText>}
      </ResponsiveDialogBody>

      <ResponsiveDialogFooter>
        <Button variant="outline" disabled={form.finishPending} onClick={onDone}>
          Cancel
        </Button>
        <Button
          disabled={!form.canFinish || form.finishPending}
          aria-label={`Mark ${engagement.book.title} as finished`}
          onClick={form.handleFinish}
        >
          Mark finished
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}

function useFinishReadForm(engagement: EngagementRead, onClose: () => void) {
  // Same derivation the log sheet uses, so the sheet asks exactly when the backend's
  // `_closing_unit` would refuse to guess.
  const pageFormat = engagement.formats.find((format) => format !== Format.audio) ?? null;
  const unitSwitchFormat = engagement.formats.includes(Format.audio) ? pageFormat : null;

  const [unit, setUnit] = useState<LogUnit | null>(null);
  const [finishedOn, setFinishedOnRaw] = useState(localIsoDate);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const updateStatus = useEngagementsUpdateEngagementStatus<DetailError>({
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
        setError(errorDetail(err, 'Failed to finish this read. Please try again.'));
      },
    },
  });

  function pickUnit(picked: LogUnit) {
    setUnit(picked);
    setError(null);
  }

  function setFinishedOn(value: string) {
    setFinishedOnRaw(value);
    setError(null);
  }

  const canFinish = finishedOn !== '' && (unitSwitchFormat === null || unit !== null);

  function handleFinish() {
    if (!canFinish) return;
    setError(null);
    updateStatus.mutate({
      engagementId: engagement.id,
      data: {
        status: EngagementStatusUpdateStatus.finished,
        effective_on: finishedOn,
        ...(unit !== null && { unit }),
      },
    });
  }

  return {
    unitSwitchFormat,
    unit,
    pickUnit,
    finishedOn,
    setFinishedOn,
    canFinish,
    handleFinish,
    error,
    finishPending: updateStatus.isPending,
  };
}
