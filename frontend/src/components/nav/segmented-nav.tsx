import { NavLink } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import { destinations } from './destinations';

// Tablet portrait: a full-width strip of four equal segments, sitting under the
// header. A side rail would waste the width and a bottom bar sits away from where a
// tablet is actually held.
//
// Styled to look like a segmented control without being one -- see mobile-nav.tsx for
// why these stay links.
export function SegmentedNav() {
  return (
    <nav aria-label="Main" className="border-b border-border bg-background px-4 py-2">
      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
        {destinations.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-0.5 rounded-md px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <HugeiconsIcon icon={icon} size={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
