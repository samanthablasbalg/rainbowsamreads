import userEvent from '@testing-library/user-event';
import { getAuthLogoutMockHandler, getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { AccountMenuDropdown, AccountMenuSheet } from './account-menu';

const reader = { id: 'a-user', email: 'reader@example.com', picture: null };

describe('the account menu', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('names the reader on the dropdown trigger', async () => {
    server.use(getAuthMeMockHandler(reader));

    render(<AccountMenuDropdown />);

    expect(await screen.findByRole('button', { name: /reader@example\.com/ })).toBeInTheDocument();
  });

  it('falls back to the initial of the email, because a session carries no name', async () => {
    server.use(getAuthMeMockHandler(reader));

    render(<AccountMenuSheet />);

    expect(await screen.findByText('R')).toBeInTheDocument();
  });

  it('labels the sheet trigger, which shows only an avatar', async () => {
    server.use(getAuthMeMockHandler(reader));

    render(<AccountMenuSheet />);

    expect(await screen.findByRole('button', { name: 'Account' })).toBeInTheDocument();
  });

  it('toggles the theme when Toggle theme is clicked', async () => {
    server.use(getAuthMeMockHandler(reader));
    const user = userEvent.setup();

    render(<AccountMenuDropdown />);

    await user.click(await screen.findByRole('button', { name: /reader@example\.com/ }));
    expect(document.documentElement).not.toHaveClass('dark');

    await user.click(await screen.findByRole('menuitem', { name: /toggle theme/i }));

    expect(document.documentElement).toHaveClass('dark');
  });

  it('logs out when Log out is clicked', async () => {
    server.use(getAuthMeMockHandler(reader), getAuthLogoutMockHandler());
    const requests: string[] = [];
    server.events.on('request:start', ({ request }) => {
      requests.push(`${request.method} ${new URL(request.url).pathname}`);
    });
    const user = userEvent.setup();

    render(<AccountMenuDropdown />);

    await user.click(await screen.findByRole('button', { name: /reader@example\.com/ }));
    await user.click(await screen.findByRole('menuitem', { name: /log out/i }));

    await waitFor(() => {
      expect(requests).toContain('POST /api/auth/logout');
    });
  });
});
