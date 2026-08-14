import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { ErrorState } from '@/components/common/error-state';
import { Pending } from '@/components/common/pending';
import { Button } from '@/components/ui/button';

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
