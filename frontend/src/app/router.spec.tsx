import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { destinations } from '@/config/destinations';
import { server } from '@/test/msw-server';
import { renderRoute, screen } from '@/test/render';

describe('the route tree', () => {
  it.each(destinations)('$to resolves to its own page, not the catch-all', async ({ to }) => {
    server.use(getAuthMeMockHandler());

    renderRoute(to);

    // Exactly one h1: findByRole throws on a second match, which is what would
    // reappear if the shell ever went back to rendering its own heading. Async
    // because RequireAuth renders nothing until the session query settles.
    const heading = await screen.findByRole('heading', { level: 1 });
    // A typo'd `to` resolves to the router's `*` route instead of this one, which
    // renders NotFound's heading in its place.
    expect(heading).not.toHaveTextContent('Page not found');
  });
});
