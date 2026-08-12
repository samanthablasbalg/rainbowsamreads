import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';

// Relative `to` values, so they resolve against the /library parent route rather than
// each repeating it. Order is deliberate and not alphabetical: it runs forward through
// a book's life -- what's next, what's done, what was given up on -- with the catalog
// last, since it is the whole shelf rather than a stage of reading.
const shelves = [
  { to: 'tbr', label: 'To Read' },
  { to: 'finished', label: 'Finished' },
  { to: 'dnf', label: 'DNF' },
  { to: 'catalog', label: 'Catalog' },
];

// Links, not shadcn `Tabs`, for the same reason mobile-nav gives: these change the URL
// and swap which screen is mounted. `role=tablist` would promise a screen reader panels
// that do not exist, and a button would cost cmd-click, copy-link-address and Back.
// NavLink also marks the active one `aria-current="page"`, which is the right
// announcement for "you are here" in a nav.
//
// The active underline is an ::after bar faded in rather than toggled, so it can
// transition. There is no state here: the URL decides, through NavLink's own isActive.
export function LibraryNav() {
  return (
    <nav aria-label="Library" className="mb-4 flex items-center gap-1 border-b border-border">
      {shelves.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'relative px-3 py-2 text-sm font-medium transition-colors',
              'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground',
              'after:opacity-0 after:transition-opacity',
              isActive
                ? 'text-foreground after:opacity-100'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
