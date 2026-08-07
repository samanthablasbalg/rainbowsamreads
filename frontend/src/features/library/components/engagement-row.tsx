import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  BookOpen01Icon,
  Delete02Icon,
  HeadphonesIcon,
  MoreVerticalIcon,
  StarIcon,
  Tablet01Icon,
} from '@hugeicons/core-free-icons';
import {
  ReadingStatus,
  type EngagementRead,
  type Format,
} from '@/api/generated/readingTracker.schemas';
import { CoverImage } from '@/components/common/cover-image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StarRating } from './star-rating';

const FORMAT_ICONS: Record<Format, IconSvgElement> = {
  print: BookOpen01Icon,
  digital: Tablet01Icon,
  audio: HeadphonesIcon,
};

// `finished_on` and `abandoned_on` are date-only strings ("2025-03-12"). `new Date` reads
// those as UTC midnight, so formatting them in local time lands on the previous day for
// anyone behind UTC -- ADR-0024's problem, in the other direction. Formatting in UTC too
// keeps the calendar day the backend wrote.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// One row for both the finished and DNF shelves. They differ in two details, not in
// structure, so this is a branch rather than a second component: which date is shown,
// and whether the point it was abandoned at is.
//
// `completion_pct` is text rather than the ReadingProgress bar deliberately -- a bar
// reads as a read still in motion, which is the one thing a DNF is not.
//
// Every action renders without a handler: deletion and the review editor are their own
// punch list items.
export function EngagementRow({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, cover_url, status, finished_on, abandoned_on, completion_pct, review } =
    engagement;
  const isDnf = status === ReadingStatus.dnf;
  const endedOn = isDnf ? abandoned_on : finished_on;

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

          {endedOn && (
            <p className="text-sm text-muted-foreground">
              {isDnf ? 'Abandoned' : 'Finished'} {formatDate(endedOn)}
            </p>
          )}

          {isDnf && completion_pct !== null && (
            <p className="text-sm text-muted-foreground">Stopped at {completion_pct}%</p>
          )}

          <div className="mt-auto flex items-center gap-2 pt-1">
            {review?.rating ? (
              <StarRating rating={review.rating} />
            ) : (
              <Button variant="outline" size="sm" aria-label={`Add a rating for ${book.title}`}>
                <HugeiconsIcon icon={StarIcon} />
                Add rating
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto"
                    aria-label={`More actions for ${book.title}`}
                  >
                    <HugeiconsIcon icon={MoreVerticalIcon} />
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuItem aria-label={`Rate and review ${book.title}`}>
                  <HugeiconsIcon icon={StarIcon} />
                  {review?.rating ? 'Edit rating & review' : 'Add rating & review'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" aria-label={`Delete ${book.title}`}>
                  <HugeiconsIcon icon={Delete02Icon} />
                  Delete read
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    </li>
  );
}
