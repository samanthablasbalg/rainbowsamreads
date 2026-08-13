import { useState } from 'react';
import { Link } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cancel02Icon,
  Delete02Icon,
  HistoryIcon,
  MoreVerticalIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getEngagementsListEngagementsQueryKey,
  useEngagementsDeleteEngagement,
  useEngagementsUpdateEngagementStatus,
} from '@/api/generated/engagements/engagements';
import {
  EngagementStatusUpdateStatus,
  type EngagementRead,
} from '@/api/generated/readingTracker.schemas';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { CoverImage } from '@/components/common/cover-image';
import { FormatIcons } from '@/components/common/format-icons';
import { ReadingProgress } from '@/components/common/reading-progress';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { authorNames, coverSrc } from '@/utils/book';
import { localIsoDate } from '@/utils/local-date';
import { ProgressLogSheet } from '@/components/common/progress-log-sheet';

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
export function ReadingCard({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, completion_pct } = engagement;
  const queryClient = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);

  function invalidateEngagements() {
    queryClient.invalidateQueries({ queryKey: getEngagementsListEngagementsQueryKey() });
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
      {/* A grid rather than a wrapping row, so exactly one thing decides the layout: the
          @xl container query. Stacked below it, one line above it. Nothing here reflows off
          its own content width, so there is no wrap point that can disagree with the
          threshold -- which is what put the button full-width across a tablet. Everything
          but the ⋮ is auto-placed in DOM order; @xl only widens the track list and undoes
          the two spans. */}
      <Card
        size="sm"
        className="@container grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 px-(--card-spacing) @xl:grid-cols-[auto_1fr_auto_auto_auto]"
      >
        {/* Wrapped in a div because Card treats a bare `img` first child as a full-bleed
            hero and drops the card's top padding. Spans the three stacked rows so the
            title, bar and button all share one left edge beside it. */}
        <div className="row-span-3 @xl:row-span-1">
          <CoverImage src={coverSrc(engagement)} title={book.title} />
        </div>

        {/* The 1fr track: every bit of the card's slack lands on the title and nothing else
            can inflate, which is what the bar's max-width cap used to be holding back.
            `min-w-0` because a grid item defaults to `min-width: auto` and a long title
            would push the track wider than its share. */}
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="leading-tight">{book.title}</CardTitle>

          <p className="text-sm text-muted-foreground">{authorNames(book)}</p>

          {/* Its own line under the author rather than trailing the title: as a chip it
              no longer sits on the title's baseline, and a multi-format read shows two. */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <FormatIcons formats={formats} />
          </div>
        </div>

        {/* Stacked, it spans both content columns -- the full width beside the cover, so it
            can't be crushed into the ~60px the old shared line gave it. On one line its
            track is `auto`, so it needs a width of its own. */}
        <ReadingProgress
          title={book.title}
          pct={completion_pct}
          className="col-span-2 @xl:col-span-1 @xl:w-40"
        />

        {/* Stacked, it fills its two columns as the primary action. On one line it sits in
            an `auto` track and takes its natural width -- there is no mechanism by which it
            can stretch, rather than a rule telling it not to. */}
        <Button
          size="sm"
          className="col-span-2 @xl:col-span-1"
          aria-label={`Log progress for ${book.title}`}
          onClick={() => setLogOpen(true)}
        >
          Log progress
        </Button>

        {/* The only explicitly placed child: it is last in the DOM for tab order but belongs
            in the top corner while stacked, which auto-placement would not give it. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="col-start-3 row-start-1 self-start @xl:col-start-5 @xl:self-center"
                aria-label={`More actions for ${book.title}`}
              >
                <HugeiconsIcon icon={MoreVerticalIcon} />
              </Button>
            }
          />
          <DropdownMenuContent>
            {/* A real link rather than a navigate() on click, so the read's page
                    opens in a new tab on a modified click like any other. */}
            <DropdownMenuItem
              aria-label={`View history for ${book.title}`}
              render={<Link to={`/reads/${engagement.id}`} />}
            >
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
