import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorState } from '@/components/common/error-state';
import { Pending } from '@/components/common/pending';
import { Button } from '@/components/ui/button';

// Both halves of what a screen used to carry itself: what shows while its data is in
// flight, and what shows when that data throws. The screens read `data` and nothing else.
//
// This replaces react-router's ErrorBoundary on the routes it sits on, because a
// react-router boundary cannot be reset in place -- once it catches, it stays caught
// until you navigate or reload, which is why the retry here was a full page reload. The
// pair below is what TanStack documents for suspense: QueryErrorResetBoundary hands out
// a `reset` that clears the remembered failure in the cache, and react-error-boundary's
// ErrorBoundary re-renders the subtree. Try again needs both -- re-rendering alone would
// read the same cached error straight back.
//
// Suspense sits inside the error boundary, not outside: a query that throws must reach
// the boundary rather than being treated as still loading.
export function ContentBoundary() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorState
              error={error}
              action={
                <Button variant="outline" onClick={resetErrorBoundary}>
                  Try again
                </Button>
              }
            />
          )}
        >
          <Suspense fallback={<Pending />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
