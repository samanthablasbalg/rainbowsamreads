import { HttpResponse, delay, http } from 'msw';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { getEngagementsListEngagementsMockHandler } from '@/api/generated/engagements/engagements.msw';
import { server } from '@/test/msw-server';
import { renderRoute, screen } from '@/test/render';

const signedOut = http.get('*/api/auth/me', () => new HttpResponse(null, { status: 401 }));
const sessionBroken = http.get('*/api/auth/me', () => new HttpResponse(null, { status: 500 }));
const sessionHanging = http.get('*/api/auth/me', () => delay('infinite'));

describe('the route guards', () => {
  it('renders an authenticated route once the session resolves', async () => {
    server.use(getAuthMeMockHandler());

    const { router } = renderRoute('/home');

    expect(await screen.findAllByRole('navigation', { name: 'Main' })).toHaveLength(2);
    expect(router.state.location.pathname).toBe('/home');
  });

  it('announces that it is working while the session is in flight', async () => {
    server.use(sessionHanging);

    renderRoute('/home');

    expect(await screen.findByRole('status')).toBeVisible();
  });

  it('sends an authenticated route to the landing page when signed out', async () => {
    server.use(signedOut);

    const { router } = renderRoute('/home');

    expect(await screen.findByRole('navigation', { name: 'Landing' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/');
  });

  it('sends the landing page to the app when already signed in', async () => {
    server.use(getAuthMeMockHandler(), getEngagementsListEngagementsMockHandler());

    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'Currently Reading' })).toBeVisible();
  });

  it('leaves the landing page alone when signed out', async () => {
    server.use(signedOut);

    const { router } = renderRoute('/');

    expect(await screen.findByRole('navigation', { name: 'Landing' })).toBeVisible();
    expect(router.state.location.pathname).toBe('/');
  });

  it('shows the error page, not the landing page, when the session request fails', async () => {
    server.use(sessionBroken);

    renderRoute('/home');

    expect(await screen.findByText('Something went wrong on our end')).toBeVisible();
  });
});
