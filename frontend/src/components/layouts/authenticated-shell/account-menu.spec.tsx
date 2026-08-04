import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { AccountMenuDropdown, AccountMenuSheet } from './account-menu';

const reader = { id: 'a-user', email: 'reader@example.com', picture: null };

// Only the trigger is reachable here. Both shapes render their actions on open, and
// opening is Base UI's doing -- so the theme toggle and log out are Playwright's.
describe('the account menu', () => {
  it('names the reader on the dropdown trigger', async () => {
    server.use(getAuthMeMockHandler(reader));

    render(<AccountMenuDropdown />);

    expect(await screen.findByText('reader@example.com')).toBeInTheDocument();
  });

  it('falls back to the initial of the email, because a session carries no name', async () => {
    server.use(getAuthMeMockHandler(reader));

    render(<AccountMenuSheet />);

    // Uppercased -- the address itself is lower case.
    expect(await screen.findByText('R')).toBeInTheDocument();
  });

  it('labels the sheet trigger, which shows only an avatar', async () => {
    server.use(getAuthMeMockHandler(reader));

    render(<AccountMenuSheet />);

    expect(await screen.findByRole('button', { name: 'Account' })).toBeInTheDocument();
  });
});
