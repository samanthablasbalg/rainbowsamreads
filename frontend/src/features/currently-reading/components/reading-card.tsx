import { useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  BookOpen01Icon,
  Cancel02Icon,
  Delete02Icon,
  HeadphonesIcon,
  HistoryIcon,
  MoreVerticalIcon,
  Tablet01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useEngagementsDeleteEngagement,
  useEngagementsUpdateEngagementStatus,
} from '@/api/generated/engagements/engagements';
import {
  EngagementStatusUpdateStatus,
  type EngagementRead,
  type Format,
} from '@/api/generated/readingTracker.schemas';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { CoverImage } from '@/components/common/cover-image';
import { ReadingProgress } from '@/components/common/reading-progress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { localIsoDate } from '@/utils/local-date';
import { ProgressLogSheet } from './progress-log-sheet';

// One icon per format a read is bound to. `formats` is an array, not a single value --
// the data model allows a read to be bound to more than one edition (print and audio
// on the same engagement) -- so this is a lookup applied per format, not a switch on
// `formats[0]`.
const FORMAT_ICONS: Record<Format, IconSvgElement> = {
  print: BookOpen01Icon,
  digital: Tablet01Icon,
  audio: HeadphonesIcon,
};

// The three actions that ask before they act, keyed by the state that opens the dialog.
// Copy lives here rather than inline so the three branches read side by side; `title` is
// a function only because the book's name goes in it.
const CONFIRMATIONS = {
  finished: {
    title: (bookTitle: string) => `Mark "${bookTitle}" as finished?`,
    description: 'This moves it out of Currently Reading.',
    confirmLabel: 'Mark finished',
    tone: 'default',
  },
  dnf: {
    title: (bookTitle: string) => `Mark "${bookTitle}" as did not finish?`,
    description: 'This moves it out of Currently Reading.',
    confirmLabel: 'Mark as DNF',
    tone: 'default',
  },
  delete: {
    title: (bookTitle: string) => `Delete this read of "${bookTitle}"?`,
    description: "This removes the read and its progress logs. This can't be undone.",
    confirmLabel: 'Delete',
    tone: 'danger',
  },
} as const;

type ConfirmAction = keyof typeof CONFIRMATIONS;

// Cover-led row per ADR-0020: cover, title, author, format icon(s), progress. Finish,
// DNF and delete each confirm first -- [[0031]] -- then PATCH/DELETE and invalidate the
// engagements list so the card leaves this screen once its status no longer matches.
// View history still has no handler -- it is its own, much later, punch list item.
export function ReadingCard({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, cover_url, completion_pct } = engagement;
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);

  function invalidateEngagements() {
    queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
  }

  const updateStatus = useEngagementsUpdateEngagementStatus({
    mutation: { onSuccess: invalidateEngagements },
  });
  const deleteEngagement = useEngagementsDeleteEngagement({
    mutation: { onSuccess: invalidateEngagements },
  });

  function handleConfirm() {
    if (pendingAction === 'delete') {
      deleteEngagement.mutate({ engagementId: engagement.id });
    } else if (pendingAction !== null) {
      // `effective_on` per ADR-0024 § 3, same as `started_on` on the way in. It lands on
      // `finished_on`/`abandoned_on` and on the completion log the backend writes when a
      // print read is finished short of its last page, so the server's date would date
      // all three to tomorrow for an evening finish behind UTC.
      updateStatus.mutate({
        engagementId: engagement.id,
        data: {
          status: EngagementStatusUpdateStatus[pendingAction],
          effective_on: localIsoDate(),
        },
      });
    }
    setPendingAction(null);
  }

  const confirmation = pendingAction && CONFIRMATIONS[pendingAction];

  return (
    <li aria-label={book.title}>
      <Card size="sm" className="flex-row items-start gap-3">
        <CoverImage src={cover_url ?? book.default_cover_url} title={book.title} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="font-medium leading-tight">{book.title}</span>
            {formats.map((format) => (
              <HugeiconsIcon
                key={format}
                icon={FORMAT_ICONS[format]}
                size={14}
                role="img"
                aria-label={`Format: ${format}`}
                className="text-muted-foreground"
              />
            ))}
          </div>

          <p className="truncate text-sm text-muted-foreground">
            {book.authors.map((author) => author.name).join(', ')}
          </p>

          <ReadingProgress title={book.title} pct={completion_pct} />

          <div className="mt-auto flex items-center gap-2 pt-1">
            <Button
              size="sm"
              aria-label={`Log progress for ${book.title}`}
              onClick={() => setLogOpen(true)}
            >
              Log progress
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`More actions for ${book.title}`}
                  >
                    <HugeiconsIcon icon={MoreVerticalIcon} />
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuItem aria-label={`View history for ${book.title}`}>
                  <HugeiconsIcon icon={HistoryIcon} />
                  View history
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  aria-label={`Mark ${book.title} as finished`}
                  onClick={() => setPendingAction('finished')}
                >
                  <HugeiconsIcon icon={Tick02Icon} />
                  Mark as finished
                </DropdownMenuItem>
                <DropdownMenuItem
                  aria-label={`Mark ${book.title} as DNF`}
                  onClick={() => setPendingAction('dnf')}
                >
                  <HugeiconsIcon icon={Cancel02Icon} />
                  Mark as DNF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  aria-label={`Delete ${book.title}`}
                  onClick={() => setPendingAction('delete')}
                >
                  <HugeiconsIcon icon={Delete02Icon} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      <ProgressLogSheet engagement={engagement} open={logOpen} onOpenChange={setLogOpen} />

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
        title={confirmation?.title(book.title)}
        description={confirmation?.description}
        confirmLabel={confirmation?.confirmLabel}
        tone={confirmation?.tone}
        onConfirm={handleConfirm}
      />
    </li>
  );
}
