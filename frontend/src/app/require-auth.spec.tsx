import { HttpResponse, http } from 'msw';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { renderRoute, screen } from '@/test/render';

const signedOut = http.get('*/api/auth/me', () => new HttpResponse(null, { status: 401 }));
const sessionBroken = http.get('*/api/auth/me', () => new HttpResponse(null, { status: 500 }));

// Every assertion is `findBy`, never `getBy`: the guards render nothing until the
// session query settles, so a synchronous query would run against a blank document
// and fail for the wrong reason.
describe('the route guards', () => {
  it('renders an authenticated route once the session resolves', async () => {
    server.use(getAuthMeMockHandler());

    renderRoute('/home');

    expect(await screen.findByRole('heading', { name: 'Currently Reading' })).toBeVisible();
  });

  it('sends an authenticated route to the landing page when signed out', async () => {
    server.use(signedOut);

    renderRoute('/home');

    expect(await screen.findByRole('heading', { name: 'Rainbow Sam Reads' })).toBeVisible();
  });

  it('sends the landing page to the app when already signed in', async () => {
    server.use(getAuthMeMockHandler());

    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Currently Reading' })).toBeVisible();
  });

  it('leaves the landing page alone when signed out', async () => {
    server.use(signedOut);

    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Rainbow Sam Reads' })).toBeVisible();
  });

  // The distinction the whole error branch exists for: a session that could not be
  // loaded is not the same as a reader who is not signed in, and offering a sign-in
  // button for a 500 would be offering a fix that cannot work.
  it('shows the error page, not the landing page, when the session request fails', async () => {
    server.use(sessionBroken);

    renderRoute('/home');

    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  });
});
