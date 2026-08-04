import { HttpResponse, http } from 'msw';
import { getAuthLogoutMockHandler, getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import userEvent from '@testing-library/user-event';
import { render, renderHook, screen, waitFor } from '@/test/render';
import { useAuth } from './auth';

// The app's real topology: the account menu owns the logout, the route guard owns the
// redirect, and they are separate components sharing one cache. Two components, not
// one calling useAuth twice -- the mutation re-renders its own component either way,
// so a single component would rebuild its session query as a side effect and hide the
// very thing under test.
function SessionState() {
  const { isAuthenticated } = useAuth();
  return <span>{isAuthenticated ? 'signed in' : 'signed out'}</span>;
}

function LogoutTrigger() {
  const { logout } = useAuth();
  return <button onClick={() => logout()}>Log out</button>;
}

// The session query IS the auth state -- nothing is copied out of it -- so these are
// really assertions about how a 200 and a 401 from /auth/me each surface.
describe('useAuth', () => {
  it('reports the reader as signed in once the session resolves', async () => {
    server.use(getAuthMeMockHandler({ id: 'a-user', email: 'reader@example.com', picture: null }));

    const { result } = renderHook(() => useAuth());

    expect(result.current.isPending).toBe(true);

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user?.email).toBe('reader@example.com');
  });

  it('reports the reader as signed out when the session is rejected', async () => {
    server.use(http.get('*/api/auth/me', () => new HttpResponse(null, { status: 401 })));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isUnauthorized).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('does not report unauthorized when the session request merely fails', async () => {
    server.use(http.get('*/api/auth/me', () => new HttpResponse(null, { status: 500 })));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isUnauthorized).toBe(false);
  });

  // The reported failure: log out from the account menu and the shell stays put, the
  // menu being the only thing that disappears, with nothing 401ing until a refresh.
  it('signs out every screen, not only the component that called logout', async () => {
    server.use(getAuthMeMockHandler(), getAuthLogoutMockHandler());

    render(
      <>
        <SessionState />
        <LogoutTrigger />
      </>
    );
    expect(await screen.findByText('signed in')).toBeVisible();

    // What the backend does on logout: the session is gone, so anything asking again
    // is told 401.
    server.use(http.get('*/api/auth/me', () => new HttpResponse(null, { status: 401 })));

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByText('signed out')).toBeVisible();
  });

  it('throws away everything cached when logging out', async () => {
    server.use(getAuthMeMockHandler(), getAuthLogoutMockHandler());

    const { result, queryClient } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    // Stands in for anything fetched as the departing user. Asserting on this rather
    // than on the session query itself, because that one is still mounted and would
    // refetch straight after the clear.
    queryClient.setQueryData(['books'], ['a book belonging to the previous reader']);

    result.current.logout();

    await waitFor(() => expect(queryClient.getQueryData(['books'])).toBeUndefined());
  });
});
