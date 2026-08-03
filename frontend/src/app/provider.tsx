import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { isAxiosError } from 'axios';
import { ThemeProvider } from '@/lib/theme-provider';

// One cache for the whole app, reached through the provider below.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A failed request is retried three times by default. A 4xx means the
      // request itself was refused -- not logged in, not found -- so asking
      // again cannot change the answer. Network failures carry no response and
      // still get retried.
      retry: (failureCount, error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
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
