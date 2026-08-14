import type * as React from 'react';
import { MobileNav } from './mobile-nav';
import { RailNav } from './rail-nav';
import { Wordmark } from './wordmark';
import { AccountMenuSheet } from './account-menu';

export function AuthenticatedShell({
  search,
  children,
}: {
  search?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh bg-background">
      <div className="sticky top-0 hidden h-svh lg:flex">
        <RailNav />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-15 items-center justify-between gap-2 border-b border-border bg-background px-4 py-3 lg:justify-end lg:px-6">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <div className="flex items-center gap-1">
            {search}
            <div className="lg:hidden">
              <AccountMenuSheet />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pt-4 pb-4 lg:px-6 lg:pb-8">{children}</main>

        {/* sticky, not fixed: it stays in flow and reserves its own height, so the end of
            the page stays reachable without a hand-tuned pb on main. It has to be a child
            of this column -- sticky only travels within its containing block. */}
        <div className="sticky bottom-0 z-40 bg-background p-4 lg:hidden">
          <MobileNav />
        </div>
      </div>
    </div>
  );
}
