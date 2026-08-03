import { NavLink } from 'react-router';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';
import { destinations } from './destinations';

// The floating pill: fixed to the bottom, inset from the screen edges rather than
// spanning it, so it reads as an object sitting above the content instead of a bar
// welded to the frame.
//
// Not shadcn `Tabs` -- these are route links, not panel switches, and `role=tablist`
// would tell a screen reader the wrong thing about what pressing them does.
export function MobileNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-4 bottom-4 z-40 flex items-center gap-1 rounded-full border border-border bg-popover p-1.5 shadow-lg"
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
              isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
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
