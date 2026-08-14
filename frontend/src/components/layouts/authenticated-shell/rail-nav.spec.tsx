import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { render, screen, within } from '@/test/render';
import { RailNav } from './rail-nav';

describe('RailNav', () => {
  it('renders one link per destination', () => {
    server.use(getAuthMeMockHandler());

    render(<RailNav />);

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link')).toHaveLength(4);
    expect(within(nav).getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library');
  });

  it('marks the destination matching the current URL as current', () => {
    server.use(getAuthMeMockHandler());

    render(<RailNav />, { initialEntries: ['/library'] });

    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('shows the signed-in reader once the session request resolves', async () => {
    server.use(getAuthMeMockHandler({ id: 'a-user', email: 'reader@example.com', picture: null }));

    render(<RailNav />);

    expect(await screen.findByRole('button', { name: /reader@example\.com/ })).toBeInTheDocument();
  });
});
