import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { StarRating } from '@/components/common/star-rating';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Every status the pill can move between. `utils/status.ts` only names the three that have
// a shelf to link to, which is a different question from what a book can be set to.
const STATUS_LABELS: Record<ReadingStatus, string> = {
  interested: 'Interested',
  tbr: 'To read',
  reading: 'Reading',
  paused: 'Paused',
  finished: 'Finished',
  dnf: 'DNF',
};

// One card of labelled rows, holding what is known about this book beyond the book itself.
// It keeps its shape whether or not the book has been read -- an untracked book shows the
// same rows with actions in them, so nothing jumps when the first read is logged.
export function BookMetadata({ tracked }: { tracked: boolean }) {
  return (
    <Card className="gap-0 divide-y divide-accent py-0">
      <Row label="Status">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant={tracked ? 'secondary' : 'outline'}
                size="sm"
                className="font-extrabold"
              >
                {tracked ? 'Finished' : 'Not tracked'}
                <HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
              </Button>
            }
          />
          <DropdownMenuContent>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <DropdownMenuItem key={status}>{label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {tracked && <span className="text-xs text-muted-foreground">read 3×</span>}
      </Row>

      <Row label="Rating">
        {tracked ? (
          <>
            <StarRating rating="5.00" />
            <span className="text-xs font-bold whitespace-nowrap text-muted-foreground">
              5.0 · latest of 3
            </span>
          </>
        ) : (
          <span className="text-xs whitespace-nowrap text-muted-foreground">after a read</span>
        )}
      </Row>

      <Row label="Owned">
        {tracked ? (
          <>
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full bg-tint-3 ring-1 ring-foreground/20"
            />
            <span className="text-sm font-semibold">Paperback, since Mar 2023</span>
          </>
        ) : (
          <RowAction>Mark as owned</RowAction>
        )}
      </Row>

      <Row label="From">
        {tracked ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-bold">Alex · Jun 2026</span>
            <span className="font-serif text-sm text-muted-foreground italic">
              said it was the one to start with.
            </span>
          </div>
        ) : (
          <RowAction>Who recommended this?</RowAction>
        )}
      </Row>

      {/* The page's only route into editions. Everything about a book's editions lives
          there, which is what keeps this card about this reader's copy instead. */}
      <Button
        variant="ghost"
        className="h-12 justify-between rounded-none px-4 font-bold text-ring"
      >
        Editions & copies
        <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
      </Button>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
      <span className="w-16 shrink-0 text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">{children}</div>
    </div>
  );
}

function RowAction({ children }: { children: ReactNode }) {
  return (
    <Button
      variant="link"
      size="xs"
      className="h-auto flex-1 justify-between p-0 font-bold text-ring"
    >
      {children}
      <HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
    </Button>
  );
}
