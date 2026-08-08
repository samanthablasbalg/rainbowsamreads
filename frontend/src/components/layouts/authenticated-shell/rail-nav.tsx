import { NavLink } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import { destinations } from '@/config/destinations';
import { Wordmark } from './wordmark';
import { StreakIndicator } from './streak-indicator';
import { AccountMenuDropdown } from './account-menu';

// The left rail, shared by tablet-landscape and desktop -- the handoff draws them as
// separate screens but the rail itself is identical, so it is built once.
//
// Unlike the other two navs this one carries the wordmark, streak and account menu,
// because at these sizes the rail is the persistent chrome and the content area's top
// bar holds only the page title and search.
export function RailNav({ streakDays }: { streakDays: number }) {
  return (
    <div className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-background">
      <div className="p-4">
        <Wordmark />
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 p-2">
        {destinations.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <HugeiconsIcon icon={icon} size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Streak sits above the account row at the rail's base, per the handoff. */}
      <div className="flex flex-col gap-2 border-t border-border p-2">
        <div className="px-1">
          <StreakIndicator days={streakDays} />
        </div>
        <AccountMenuDropdown />
      </div>
    </div>
  );
}
