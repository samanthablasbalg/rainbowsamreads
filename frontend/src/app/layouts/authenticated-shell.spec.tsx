import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { AuthenticatedShell } from './authenticated-shell';

// The shell derives its page title from the URL against the destinations list rather
// than carrying route handles, so the title and the nav labels cannot drift apart.
describe('AuthenticatedShell', () => {
  it('titles the page after the destination the URL points at', () => {
    server.use(getAuthMeMockHandler());

    render(<AuthenticatedShell />, { initialEntries: ['/insights'] });

    expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
  });

  it('shows no title on a URL that is not a destination', () => {
    server.use(getAuthMeMockHandler());

    render(<AuthenticatedShell />, { initialEntries: ['/books/1'] });

    // The heading element is always rendered; only its text comes from the lookup. That
    // leaves an unnamed <h1> on every route that is not one of the four -- pinned here
    // as current behaviour, not endorsed.
    expect(screen.getByRole('heading')).toBeEmptyDOMElement();
  });

  it('renders every nav layout, leaving the choice between them to CSS', () => {
    server.use(getAuthMeMockHandler());

    render(<AuthenticatedShell />, { initialEntries: ['/home'] });

    // Two navs in the markup at once -- the rail and the pill. Which one a reader sees
    // is Tailwind's `hidden` at a breakpoint, which jsdom has no layout engine to
    // resolve, so that half is Playwright's to check.
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);
  });
});
