import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { isAxiosError } from 'axios';
import { ThemeProvider } from '@/lib/theme-provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 4xx means the request was refused, so asking again cannot change the answer.
      // Network failures carry no response and still get retried.
      retry: (failureCount, error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      // Explicit, not inherited. staleTime isn't a security control -- the server and
      // Postgres RLS enforce access regardless of what the client cache believes, and
      // any real request 401s immediately no matter how stale the cache is. What this
      // number actually controls is how long the UI can show signed-in chrome for a
      // session that's already dead (cookie expired, logged out elsewhere) before the
      // next focus/navigation re-checks. 0 keeps that window at zero, and /me is cheap
      // enough that revalidating on every focus and guarded navigation costs nothing
      // worth trading away.
      staleTime: 0,
    },
  },
});

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
