import { NavLink } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import { destinations } from '@/config/destinations';

export function MobileNav() {
  return (
    <nav
      aria-label="Main"
      className="flex items-center gap-1 rounded-full border border-border bg-popover p-1.5 shadow-lg"
    >
      {destinations.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2 text-xs transition-colors',
              isActive
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )
          }
        >
          <HugeiconsIcon icon={icon} size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
