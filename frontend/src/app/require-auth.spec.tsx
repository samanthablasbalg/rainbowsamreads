import { HttpResponse, delay, http } from 'msw';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { renderRoute, screen } from '@/test/render';

const signedOut = http.get('*/api/auth/me', () => new HttpResponse(null, { status: 401 }));
const sessionBroken = http.get('*/api/auth/me', () => new HttpResponse(null, { status: 500 }));
// Never resolves, which is the only way to hold the guards in their pending branch
// long enough to assert on it.
const sessionHanging = http.get('*/api/auth/me', () => delay('infinite'));

// Every assertion is `findBy`, never `getBy`: the guards render a pending state until
// the session query settles, so a synchronous query would run before the real content
// exists and fail for the wrong reason.
describe('the route guards', () => {
  it('renders an authenticated route once the session resolves', async () => {
    server.use(getAuthMeMockHandler());

    renderRoute('/home');

    expect(await screen.findByRole('heading', { name: 'Currently Reading' })).toBeVisible();
  });

  // The guards used to render null here, which made a cold load a blank document until
  // the session landed. Asserting on the live region rather than the text: what matters
  // is that a screen reader is told the app is working, not the wording.
  it('announces that it is working while the session is in flight', async () => {
    server.use(sessionHanging);

    renderRoute('/home');

    expect(await screen.findByRole('status')).toBeVisible();
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
