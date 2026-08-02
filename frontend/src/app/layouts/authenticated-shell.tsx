import { NavLink, Outlet } from 'react-router';
import { Session } from '@/app/session';

// The four top-level destinations from the nav shell handoff. Each must stay reachable
// in one tap from anywhere in the app, so this list is the whole of the nav -- nothing
// gets folded into a menu. The three real nav layouts in § 6 all read from here.
const destinations = [
  { to: '/home', label: 'Home' },
  { to: '/library', label: 'Library' },
  { to: '/insights', label: 'Insights' },
  { to: '/challenges', label: 'Challenges' },
];

// Deliberately unstyled. This is the frame proving the route tree works; the real
// header, rail, pill bar and tab strip replace the markup below in § 5 and § 6.
export function AuthenticatedShell() {
  return (
    <div>
      <header>
        <p>Rainbow Sam Reads</p>
        <Session />
      </header>

      <nav>
        <ul>
          {destinations.map(({ to, label }) => (
            <li key={to}>
              {/* NavLink is Link that also knows whether it points at the current
                  route. The className callback is how that reaches the styling --
                  in § 6 `isActive` drives the bg-muted pill instead of an underline. */}
              <NavLink to={to} className={({ isActive }) => (isActive ? 'underline' : undefined)}>
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Whichever child route matched renders here, while everything above stays
          mounted across navigations. */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
