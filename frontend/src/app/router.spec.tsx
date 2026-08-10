import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { getEngagementsGetEngagementMockHandler } from '@/api/generated/engagements/engagements.msw';
import { destinations } from '@/config/destinations';
import { server } from '@/test/msw-server';
import { renderRoute, screen } from '@/test/render';
import { buildEngagement } from '@/testing/data-generators';

describe('the route tree', () => {
  it.each(destinations)('$to resolves to its own page, not the catch-all', async ({ to }) => {
    server.use(getAuthMeMockHandler());

    renderRoute(to);

    // Exactly one h1: findByRole throws on a second match, which is what would
    // reappear if the shell ever went back to rendering its own heading. Async
    // because two things have to settle first -- the session query RequireAuth
    // waits on, and the route's own lazy chunk.
    const heading = await screen.findByRole('heading', { level: 1 });
    // A typo'd `to` resolves to the router's `*` route instead of this one, which
    // renders NotFound's heading in its place.
    expect(heading).not.toHaveTextContent('Page not found');
  });

  // /library is a layout with four children rather than a screen, so the loop above
  // only ever exercises whichever one the index redirect lands on.
  it.each([
    ['/library/tbr', 'To Read'],
    ['/library/finished', 'Finished'],
    ['/library/dnf', 'DNF'],
    ['/library/catalog', 'Catalog'],
  ])('%s renders its own shelf under the library nav', async (path, title) => {
    server.use(getAuthMeMockHandler());

    renderRoute(path);

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Library' })).toBeVisible();
  });

  // A leaf reached from a book's row rather than from the nav, so it is not in
  // `destinations` and the loop above never sees it. Its heading is the book's title,
  // which is also what proves the URL's segment reached the query.
  it('/reads/:engagementId renders the read named by the URL', async () => {
    server.use(getAuthMeMockHandler(), getEngagementsGetEngagementMockHandler(buildEngagement()));

    renderRoute('/reads/engagement-Piranesi');

    expect(await screen.findByRole('heading', { level: 1, name: 'Piranesi' })).toBeVisible();
  });

  it('sends /library to the catalog, since it has no screen of its own', async () => {
    server.use(getAuthMeMockHandler());

    renderRoute('/library');

    expect(await screen.findByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible();
  });
});
