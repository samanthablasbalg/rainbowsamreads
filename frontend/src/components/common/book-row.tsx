import { Fragment, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { CoverImage } from '@/components/common/cover-image';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// A row's shape is one number: how many slots sit between the identity block and the ⋮.
// The @xl track count, the cover's stacked row-span and the ⋮'s @xl column all follow from
// it -- which is why they are a table rather than three props. They were three hand-kept
// numbers in three files before, and a row with the set out of step lays out wrong in a
// way nothing catches.
//
// Literal class strings rather than `@xl:col-start-${n}`: Tailwind scans source text, so
// an interpolated class compiles to nothing at all.
const SHAPES = {
  1: {
    grid: '@xl:grid-cols-[auto_1fr_auto_auto]',
    cover: 'row-span-2',
    menu: '@xl:col-start-4',
  },
  2: {
    grid: '@xl:grid-cols-[auto_1fr_auto_auto_auto]',
    cover: 'row-span-3',
    menu: '@xl:col-start-5',
  },
} as const;

type BookRowProps = {
  title: string;
  author: string;
  cover: string | null;
  // Extra lines under the author, inside the 1fr track: formats, dates, lengths, the
  // failure of an action this row took. Prose about the book rather than actions on it,
  // which is what the slots to its right are for.
  details?: ReactNode;
  // A tuple, not an array, because its length is the shape above -- a third slot has no
  // entry in the table, so it is a type error rather than a row that renders wrong.
  slots: [ReactNode] | [ReactNode, ReactNode];
  // The ⋮ menu's items. The trigger is the row's, the contents are the caller's.
  menu: ReactNode;
  // Sheets and dialogs, rendered as siblings of the card rather than inside the grid.
  children?: ReactNode;
};

// The shared shape of the three shelf rows -- catalog, currently reading, and the
// finished/DNF shelves -- per ADR-0020's cover-led layout. Cover, identity, then one or
// two slots and the ⋮.
//
// A grid rather than a wrapping row, so exactly one thing decides the layout: the @xl
// container query. Stacked below it, one line above it. Nothing here reflows off its own
// content width, so there is no wrap point that can disagree with the threshold -- which
// is what put a button full-width across a tablet. Everything but the ⋮ is auto-placed in
// DOM order; @xl only widens the track list and undoes the spans.
//
// Slots keep their own `col-span-2 @xl:col-span-1`: stacked they fill the width beside the
// cover, and a wrapper here could not do it for them -- the grid would stretch the wrapper
// and leave the inline-flex button inside it at its natural width.
export function BookRow({ title, author, cover, details, slots, menu, children }: BookRowProps) {
  const shape = SHAPES[slots.length];

  return (
    <li aria-label={title}>
      <Card
        size="sm"
        className={cn(
          '@container grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 px-(--card-spacing)',
          shape.grid
        )}
      >
        {/* Wrapped because Card treats a bare `img` first child as a full-bleed hero and
            drops its top padding -- and CoverImage renders a bare `img` whenever a cover
            loads, so without this the row's padding would depend on whether the image
            arrived. Spans the stacked rows, so everything beside it shares one left edge. */}
        <div className={cn(shape.cover, '@xl:row-span-1')}>
          <CoverImage src={cover} title={title} />
        </div>

        {/* The 1fr track: every bit of the row's slack lands on the title and nothing else
            can inflate. `min-w-0` because a grid item defaults to `min-width: auto` and a
            long title would push the track wider than its share. */}
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="leading-tight">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{author}</p>
          {details}
        </div>

        {slots.map((slot, index) => (
          <Fragment key={index}>{slot}</Fragment>
        ))}

        {/* The only explicitly placed child: it is last in the DOM for tab order but belongs
            in the top corner while stacked, which auto-placement would not give it. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn('col-start-3 row-start-1 self-start @xl:self-center', shape.menu)}
                aria-label={`More actions for ${title}`}
              >
                <HugeiconsIcon icon={MoreVerticalIcon} />
              </Button>
            }
          />
          <DropdownMenuContent>{menu}</DropdownMenuContent>
        </DropdownMenu>
      </Card>

      {children}
    </li>
  );
}
