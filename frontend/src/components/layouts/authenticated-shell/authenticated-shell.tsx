import type * as React from 'react';
import { MobileNav } from './mobile-nav';
import { RailNav } from './rail-nav';
import { Wordmark } from './wordmark';
import { StreakIndicator } from './streak-indicator';
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
//
// `search` is a slot rather than an import: search is a feature, and a shared layout
// cannot import one without inverting the dependency direction the eslint zones
// enforce. The app layer fills it -- see app/routes/app-root.tsx.
export function AuthenticatedShell({
  search,
  children,
}: {
  search?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh bg-background">
      {/* sticky + h-svh, not the flex row's default stretch: stretched, the rail is as
          tall as the document, which puts the streak and account menu at the bottom of
          the page rather than the bottom of the screen. RailNav's h-full measures
          against this. */}
      <div className="sticky top-0 hidden h-svh lg:flex">
        <RailNav streakDays={PLACEHOLDER_STREAK_DAYS} />
      </div>

      {/* min-w-0 stops a wide child -- a long table, a code block -- from forcing this
          column past the viewport instead of scrolling inside it. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* One header at every width. Its job is to hold whatever utilities the rail
            is not holding, so at lg the rail takes the wordmark, streak and account
            menu and search is all that is left -- hence the lg:hidden on three of the
            four and the flip to justify-end. */}
        {/* min-h rather than content height: at lg every other child is hidden, so an
            expanded search bar -- which is absolutely positioned -- would leave nothing
            in flow to hold the header open. */}
        {/* sticky rather than relative: it is the containing block the expanded search
            bar positions against, and sticky is positioned too, so that still holds.
            The explicit bg is what stops content showing through as it scrolls under. */}
        <header className="sticky top-0 z-30 flex min-h-15 items-center justify-between gap-2 border-b border-border bg-background px-4 py-3 lg:justify-end lg:px-6">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <div className="flex items-center gap-1">
            <div className="lg:hidden">
              <StreakIndicator days={PLACEHOLDER_STREAK_DAYS} />
            </div>
            {search}
            <div className="lg:hidden">
              <AccountMenuSheet />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-4 lg:px-6 lg:pb-8">{children}</main>

        {/* sticky, not fixed. Fixed would take the bar out of flow, and the last of the
            page would need a hand-tuned pb on main to stay reachable -- a number that
            silently goes wrong the moment the bar's height changes. Sticky stays in
            flow, so it reserves exactly its own height and still pins to the bottom of
            the viewport while there is page left to scroll.

            It has to be a child of this column rather than a sibling: sticky travels
            within its containing block, so a wrapper sized to the bar would leave it
            nowhere to go. The bg is what content scrolls under -- the bar's padding is
            the pill's inset from the screen edges. */}
        <div className="sticky bottom-0 z-40 bg-background p-4 lg:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
