import { NavLink } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import { destinations } from '@/config/destinations';

// The pill itself and nothing else -- where it sits on the screen is the shell's, the
// same as the rail's.
//
// Not shadcn `Tabs` -- these are route links, not panel switches, and `role=tablist`
// would tell a screen reader the wrong thing about what pressing them does.
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
          // NavLink's className callback receives whether it points at the current
          // route, which is what drives the active pill rather than any local state.
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
