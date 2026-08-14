import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';

// Order runs forward through a book's life, with the catalog last as the whole shelf
// rather than a stage of reading.
const shelves = [
  { to: 'tbr', label: 'To Read' },
  { to: 'finished', label: 'Finished' },
  { to: 'dnf', label: 'DNF' },
  { to: 'catalog', label: 'Catalog' },
];

// The active underline is an ::after bar faded in rather than toggled, so it can
// transition.
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
