import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import type { EntryView } from '../utils/entry-view';

// The row is deliberately not clickable: a row-wide hit area would put every entry in the
// tab order with nothing on screen saying it was editable.
export function EntryRow({ entry, onEdit }: { entry: EntryView; onEdit: () => void }) {
  return (
    <li
      aria-label={entry.dateLabel}
      className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <span className="text-sm">{entry.dateLabel}</span>

        <span className="flex items-baseline gap-3 text-sm text-muted-foreground">
          <span>{entry.rangeLabel}</span>
          <span className="font-medium text-foreground">{entry.amountLabel}</span>
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit entry from ${entry.dateLabel}`}
        onClick={onEdit}
      >
        <HugeiconsIcon icon={PencilEdit02Icon} />
      </Button>
    </li>
  );
}
