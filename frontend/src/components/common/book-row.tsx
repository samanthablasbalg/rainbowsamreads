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

// The three values in each entry have to move together; a set out of step lays out wrong
// in a way nothing catches.
//
// Literal class strings, never `@xl:col-start-${n}`: Tailwind scans source text, so an
// interpolated class compiles to nothing at all.
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
  details?: ReactNode;
  slots: [ReactNode] | [ReactNode, ReactNode];
  menu: ReactNode;
  children?: ReactNode;
};

// Slots carry their own `col-span-2 @xl:col-span-1` rather than getting a wrapper here:
// the grid would stretch the wrapper and leave the inline-flex button inside it at its
// natural width.
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
            drops its top padding. Spans the stacked rows, so everything beside it shares one left edge. */}
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
