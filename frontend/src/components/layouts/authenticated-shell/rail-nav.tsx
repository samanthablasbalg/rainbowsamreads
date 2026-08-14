import { NavLink } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import { destinations } from '@/config/destinations';
import { Wordmark } from './wordmark';
import { AccountMenuDropdown } from './account-menu';

export function RailNav() {
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
                  ? 'bg-secondary text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <HugeiconsIcon icon={icon} size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-border p-2">
        <AccountMenuDropdown />
      </div>
    </div>
  );
}
