import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { AuthenticatedShell } from './authenticated-shell';

describe('AuthenticatedShell', () => {
  it('renders every nav layout, leaving the choice between them to CSS', () => {
    server.use(getAuthMeMockHandler());

    render(<AuthenticatedShell />, { initialEntries: ['/home'] });

    // Two navs in the markup at once -- the rail and the pill. Which one a reader sees
    // is Tailwind's `hidden` at a breakpoint, which jsdom has no layout engine to
    // resolve, so that half is Playwright's to check.
    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);
  });
});
