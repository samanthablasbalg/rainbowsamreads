import { Suspense, type ReactElement, type ReactNode } from 'react';
import {
  render,
  renderHook,
  type RenderOptions,
  type RenderHookOptions,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/app/router';
import { Pending } from '@/components/common/pending';
import { ThemeProvider } from '@/lib/theme-provider';

type ProviderOptions = {
  initialEntries?: string[];
};

function createWrapper(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={initialEntries}>
            <Suspense fallback={<Pending />}>{children}</Suspense>
          </MemoryRouter>
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

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return {
    router,
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
