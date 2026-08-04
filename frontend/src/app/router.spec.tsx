import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { render, screen } from '@testing-library/react';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { destinations } from '@/config/destinations';
import { ThemeProvider } from '@/lib/theme-provider';
import { server } from '@/test/msw-server';
import { routes } from './router';

// createMemoryRouter, not the customRender helper's MemoryRouter -- that wraps a
// single component, but this walks the real route tree, which is the thing under
// test: a `to` in destinations.ts that doesn't match a path in `routes` falls
// through to the catch-all instead of erroring.
function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe('the route tree', () => {
  it.each(destinations)('$to resolves to its own page, not the catch-all', ({ to }) => {
    server.use(getAuthMeMockHandler());

    renderAt(to);

    // Exactly one h1: getByRole throws on a second match, which is what would
    // reappear if the shell ever went back to rendering its own heading.
    const heading = screen.getByRole('heading', { level: 1 });
    // A typo'd `to` resolves to the router's `*` route instead of this one, which
    // renders NotFound's heading in its place.
    expect(heading).not.toHaveTextContent('Page not found');
  });
});
