import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
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

        <span className="ml-auto text-xs font-extrabold text-brand-pink tabular-nums">
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

      <EntrySpan startPct={entry.startPct} endPct={entry.endPct} />

      {entry.note && (
        <div className="mt-3">
          <NoteExcerpt>{entry.note}</NoteExcerpt>
        </div>
      )}
    </div>
  );
}

// Where the session sits in the whole book: everything before it in the border colour,
// the session itself in primary. Hidden from assistive tech because it restates the
// positions the line above already gives in words.
function EntrySpan({ startPct, endPct }: { startPct: number; endPct: number }) {
  return (
    <div aria-hidden="true" className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="absolute inset-y-0 left-0 bg-border" style={{ width: `${startPct}%` }} />
      <div
        className="absolute inset-y-0 rounded-full bg-primary"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />
    </div>
  );
}
