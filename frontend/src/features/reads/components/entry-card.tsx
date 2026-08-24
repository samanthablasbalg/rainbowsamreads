import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EntryView } from '../utils/entry-view';
import { NoteExcerpt } from './note-excerpt';

// No date on the card: the day group's header carries it, so a second session the same
// day doesn't say it twice.
export function EntryCard({ entry, onEdit }: { entry: EntryView; onEdit: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3.5 py-3">
      <div className="flex items-baseline gap-2">
        <span className="text-base font-extrabold tabular-nums">{entry.fromLabel}</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-base font-extrabold tabular-nums">{entry.toLabel}</span>

        {/* Orange for a re-read, the same colour its half of the bar below is drawn in. */}
        <span
          className={cn(
            'ml-auto text-xs font-extrabold tabular-nums',
            entry.hasNewGround ? 'text-brand-pink' : 'text-brand-orange'
          )}
        >
          {entry.amountLabel}
        </span>

        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Edit entry from ${entry.dateLabel}`}
          onClick={onEdit}
        >
          <HugeiconsIcon icon={PencilEdit02Icon} />
        </Button>
      </div>

      <EntrySpan entry={entry} />

      {entry.note && (
        <div className="mt-3">
          <NoteExcerpt>{entry.note}</NoteExcerpt>
        </div>
      )}
    </div>
  );
}

// Where the session sits in the whole book: how far the read had already got in the
// border colour, then the session itself on top of it, orange for the part it had
// covered before and primary for the new ground. The underlay runs to the frontier
// rather than to the session's start, so a re-read still shows the ground waiting ahead
// of it -- for a new-ground session the two are the same number.
//
// Each half of the session is rounded on the outer end and square where they meet, so
// the changeover is one vertical edge rather than two caps pinching together -- and
// rounds its inner end as well when `splitPct` has collapsed onto an end and it is the
// whole session. Named rather than hidden: where the session crossed the frontier is
// only drawn here, so hiding it would drop that from the card entirely.
function EntrySpan({ entry }: { entry: EntryView }) {
  const { coveredPct, startPct, splitPct, endPct } = entry;

  return (
    <div
      role="img"
      aria-label={entry.spanLabel}
      className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-border"
        style={{ width: `${coveredPct}%` }}
      />
      <div
        className={cn(
          'absolute inset-y-0 rounded-l-full bg-brand-orange',
          splitPct === endPct && 'rounded-r-full'
        )}
        style={{ left: `${startPct}%`, width: `${splitPct - startPct}%` }}
      />
      <div
        className={cn(
          'absolute inset-y-0 rounded-r-full bg-primary',
          splitPct === startPct && 'rounded-l-full'
        )}
        style={{ left: `${splitPct}%`, width: `${endPct - splitPct}%` }}
      />
    </div>
  );
}
