import { Outlet } from 'react-router';
import { MobileNav } from './mobile-nav';
import { RailNav } from './rail-nav';
import { Wordmark } from './wordmark';
import { StreakIndicator } from './streak-indicator';
import { SearchButton } from './search-button';
import { AccountMenuSheet } from './account-menu';

// Placeholder. Nothing serves a streak yet, so the number is invented here, in the
// open, rather than inside StreakIndicator where it would be easy to ship by accident.
const PLACEHOLDER_STREAK_DAYS = 7;

// The responsive switch is CSS, not JS: all three navs are in the markup and Tailwind
// shows exactly one. `hidden` is `display: none`, which takes the other two out of the
// accessibility tree entirely -- so a screen reader and the tab order see one nav, not
// three. The alternative, a useMediaQuery hook, would need a resize listener and would
// render no nav at all on the first paint.
//
// Breakpoints, on Tailwind's defaults: the pill nav up to lg, the rail at lg and up.
// A tablet in portrait gets the phone's bottom nav; in landscape it gets the rail.
export function AuthenticatedShell() {
  return (
    <div className="flex min-h-svh bg-background">
      <div className="hidden lg:flex">
        <RailNav streakDays={PLACEHOLDER_STREAK_DAYS} />
      </div>

      {/* min-w-0 stops a wide child -- a long table, a code block -- from forcing this
          column past the viewport instead of scrolling inside it. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Below lg the wordmark, streak and account menu live in the header. At lg
            and up the rail carries them, and this header is replaced by the top bar
            underneath. */}
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 lg:hidden">
          <Wordmark />
          <div className="flex items-center gap-1">
            <StreakIndicator days={PLACEHOLDER_STREAK_DAYS} />
            <SearchButton />
            <AccountMenuSheet />
          </div>
        </header>

        <header className="hidden items-center justify-end gap-2 border-b border-border px-6 py-3 lg:flex">
          <SearchButton variant="outline" />
        </header>

        {/* The pill nav is fixed, so it sits over the bottom of the content. The extra
            padding below md is what keeps the last of the page reachable. */}
        <main className="flex-1 px-4 pt-4 pb-28 lg:px-6 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <div className="lg:hidden">
        <MobileNav />
      </div>
    </div>
  );
}
