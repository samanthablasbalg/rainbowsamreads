import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '@/app/theme-provider';

type CustomRenderOptions = Omit<RenderOptions, 'wrapper'> & {
  // The router's history. A single entry is the starting URL, which is what NavLink
  // reads to decide whether it is active.
  initialEntries?: string[];
};

// The same three providers as main.tsx and provider.tsx, in the same order.
//
// MemoryRouter rather than the createBrowserRouter tree in app/router.tsx: it takes the
// component under test directly instead of requiring it to be reachable through a
// route. Tests that need real routing -- redirects, loaders -- want the actual router.
function customRender(
  ui: ReactElement,
  { initialEntries = ['/'], ...options }: CustomRenderOptions = {}
) {
  // A fresh client per test, so nothing cached in one leaks into another. retry: false
  // matters: the app's client in provider.tsx retries twice with a backoff, and every
  // error-path test would sit through it.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
