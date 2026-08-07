import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { renderRoute, screen } from '@/test/render';

// Through the real route tree, not a hand-built <Routes> harness. This component's whole
// contract is that its relative links resolve against the /library parent route -- and
// that resolution depends on how the route is nested, so a harness that nests it even
// slightly differently tests the harness instead. A `path="/library/*"` splat, for one,
// resolves relative links against the entire matched URL and silently sends every link
// one level too deep.
describe('LibraryNav', () => {
  it('resolves its links against /library, not the current shelf', async () => {
    server.use(getAuthMeMockHandler());

    renderRoute('/library/finished');

    expect(await screen.findByRole('link', { name: 'To Read' })).toHaveAttribute(
      'href',
      '/library/tbr'
    );
  });

  it('marks only the current shelf as active', async () => {
    server.use(getAuthMeMockHandler());

    renderRoute('/library/finished');

    // aria-current is NavLink's own active signal and the one the underline hangs off,
    // so asserting it covers both the announcement and the styling hook.
    expect(await screen.findByRole('link', { name: 'Finished' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Catalog' })).not.toHaveAttribute('aria-current');
  });
});
