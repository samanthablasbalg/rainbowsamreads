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
import { useConfirm } from '@/lib/confirm-context';

// One icon per format a read is bound to. `formats` is an array, not a single value --
// the data model allows a read to be bound to more than one edition (print and audio
// on the same engagement) -- so this is a lookup applied per format, not a switch on
// `formats[0]`.
const FORMAT_ICONS: Record<Format, IconSvgElement> = {
  print: BookOpen01Icon,
  digital: Tablet01Icon,
  audio: HeadphonesIcon,
};

// Cover-led row per ADR-0020: cover, title, author, format icon(s), progress. Finish,
// DNF and delete each confirm() first -- [[0031]] -- then PATCH/DELETE and invalidate
// the engagements list so the card leaves this screen once its status no longer
// matches. View history and Log progress still have no handler: history is its own,
// much later, punch list item, and logging needs progress-log-sheet.
export function ReadingCard({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, cover_url, completion_pct } = engagement;
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  function invalidateEngagements() {
    queryClient.invalidateQueries({ queryKey: ['/api/engagements'] });
  }

  const updateStatus = useEngagementsUpdateEngagementStatus({
    mutation: { onSuccess: invalidateEngagements },
  });
  const deleteEngagement = useEngagementsDeleteEngagement({
    mutation: { onSuccess: invalidateEngagements },
  });

  async function handleMarkFinished() {
    const confirmed = await confirm({
      title: `Mark "${book.title}" as finished?`,
      description: 'This moves it out of Currently Reading.',
      confirmLabel: 'Mark finished',
    });
    if (!confirmed) return;
    updateStatus.mutate({
      engagementId: engagement.id,
      data: { status: EngagementStatusUpdateStatus.finished },
    });
  }

  async function handleMarkDnf() {
    const confirmed = await confirm({
      title: `Mark "${book.title}" as did not finish?`,
      description: 'This moves it out of Currently Reading.',
      confirmLabel: 'Mark as DNF',
    });
    if (!confirmed) return;
    updateStatus.mutate({
      engagementId: engagement.id,
      data: { status: EngagementStatusUpdateStatus.dnf },
    });
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Delete this read of "${book.title}"?`,
      description: "This removes the read and its progress logs. This can't be undone.",
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    deleteEngagement.mutate({ engagementId: engagement.id });
  }

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
            <Button size="sm" aria-label={`Log progress for ${book.title}`}>
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
                  onClick={handleMarkFinished}
                >
                  <HugeiconsIcon icon={Tick02Icon} />
                  Mark as finished
                </DropdownMenuItem>
                <DropdownMenuItem aria-label={`Mark ${book.title} as DNF`} onClick={handleMarkDnf}>
                  <HugeiconsIcon icon={Cancel02Icon} />
                  Mark as DNF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  aria-label={`Delete ${book.title}`}
                  onClick={handleDelete}
                >
                  <HugeiconsIcon icon={Delete02Icon} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    </li>
  );
}
