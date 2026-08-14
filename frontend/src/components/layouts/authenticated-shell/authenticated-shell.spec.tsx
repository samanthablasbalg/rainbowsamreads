import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { AuthenticatedShell } from './authenticated-shell';

describe('AuthenticatedShell', () => {
  it('renders every nav layout, leaving the choice between them to CSS', () => {
    server.use(getAuthMeMockHandler());

    render(<AuthenticatedShell />, { initialEntries: ['/home'] });

    expect(screen.getAllByRole('navigation', { name: 'Main' })).toHaveLength(2);
  });
});
