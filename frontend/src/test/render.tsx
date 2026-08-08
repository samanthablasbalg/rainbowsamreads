import type { ReactElement, ReactNode } from 'react';
import {
  render,
  renderHook,
  type RenderOptions,
  type RenderHookOptions,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/router';
import { ThemeProvider } from '@/lib/theme-provider';

type ProviderOptions = {
  // The router's history. A single entry is the starting URL, which is what NavLink
  // reads to decide whether it is active.
  initialEntries?: string[];
};

// The same providers as main.tsx and provider.tsx, in the same order.
//
// MemoryRouter rather than the createBrowserRouter tree in app/router.tsx: it takes the
// component under test directly instead of requiring it to be reachable through a
// route. Tests that need real routing -- redirects, loaders -- want the actual router.
function createWrapper(initialEntries: string[]) {
  // A fresh client per render, so nothing cached in one test leaks into another.
  // retry: false matters: the app's client in provider.tsx retries twice with a
  // backoff, and every error-path test would sit through it.
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

  return { queryClient, Wrapper };
}

function customRender(
  ui: ReactElement,
  { initialEntries = ['/'], ...options }: Omit<RenderOptions, 'wrapper'> & ProviderOptions = {}
) {
  const { queryClient, Wrapper } = createWrapper(initialEntries);
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
}

function customRenderHook<Result, Props>(
  hook: (props: Props) => Result,
  {
    initialEntries = ['/'],
    ...options
  }: Omit<RenderHookOptions<Props>, 'wrapper'> & ProviderOptions = {}
) {
  const { queryClient, Wrapper } = createWrapper(initialEntries);
  return { queryClient, ...renderHook(hook, { wrapper: Wrapper, ...options }) };
}

// Walks the real route tree from app/router.tsx instead of wrapping one component the
// way `render` does. Anything whose subject IS the routing -- the guards, redirects,
// the catch-all -- needs the actual tree, and createMemoryRouter is the constructor
// that takes a starting URL.
function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return {
    queryClient,
    ...render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ThemeProvider>
    ),
  };
}

export * from '@testing-library/react';
export { customRender as render, customRenderHook as renderHook, renderRoute };
