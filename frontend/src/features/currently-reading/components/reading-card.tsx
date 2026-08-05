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
import type { EngagementRead, Format } from '@/api/generated/readingTracker.schemas';
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

// One icon per format a read is bound to. `formats` is an array, not a single value --
// the data model allows a read to be bound to more than one edition (print and audio
// on the same engagement) -- so this is a lookup applied per format, not a switch on
// `formats[0]`.
const FORMAT_ICONS: Record<Format, IconSvgElement> = {
  print: BookOpen01Icon,
  digital: Tablet01Icon,
  audio: HeadphonesIcon,
};

// Cover-led row per ADR-0020: cover, title, author, format icon(s), progress. The
// overflow menu opens and lists its four actions, but the actions themselves --
// like the Log progress button beside it -- have no handler yet; confirm(),
// mutations and invalidateQueries are punch list §7 work.
export function ReadingCard({ engagement }: { engagement: EngagementRead }) {
  const { book, formats, cover_url, completion_pct } = engagement;

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
                <DropdownMenuItem aria-label={`Mark ${book.title} as finished`}>
                  <HugeiconsIcon icon={Tick02Icon} />
                  Mark as finished
                </DropdownMenuItem>
                <DropdownMenuItem aria-label={`Mark ${book.title} as DNF`}>
                  <HugeiconsIcon icon={Cancel02Icon} />
                  Mark as DNF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" aria-label={`Delete ${book.title}`}>
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
