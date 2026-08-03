import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { render, screen, within } from '@/test/render';
import { RailNav } from './rail-nav';

// RailNav touches the whole chain: destinations through NavLink, and an account row that
// calls useAuth -- an orval hook, React Query, and a request MSW has to answer.
describe('RailNav', () => {
  it('renders one link per destination', () => {
    server.use(getAuthMeMockHandler());

    render(<RailNav streakDays={7} />);

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(within(nav).getAllByRole('link')).toHaveLength(4);
    expect(within(nav).getByRole('link', { name: 'Library' })).toHaveAttribute('href', '/library');
  });

  it('marks the destination matching the current URL as current', () => {
    server.use(getAuthMeMockHandler());

    render(<RailNav streakDays={7} />, { initialEntries: ['/library'] });

    // aria-current is what NavLink sets on the active link, and what a screen reader is
    // told. Asserting on it rather than the Tailwind classes survives restyling.
    expect(screen.getByRole('link', { name: 'Library' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });

  it('shows the signed-in reader once the session request resolves', async () => {
    server.use(getAuthMeMockHandler({ id: 'a-user', email: 'reader@example.com', picture: null }));

    render(<RailNav streakDays={7} />);

    // findBy, not getBy: the account row renders nothing until useAuthMe resolves, so
    // this is what proves the request went through MSW rather than never being made.
    expect(await screen.findByText('reader@example.com')).toBeInTheDocument();
  });

  it('renders the streak it is given', () => {
    server.use(getAuthMeMockHandler());

    render(<RailNav streakDays={1} />);

    // Singular, to pin the pluralisation in StreakIndicator.
    expect(screen.getByText('1 day')).toBeInTheDocument();
  });
});
