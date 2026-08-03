import { HttpResponse, http } from 'msw';
import { getAuthLogoutMockHandler, getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { renderHook, waitFor } from '@/test/render';
import { useAuth } from './use-auth';

// The session query IS the auth state -- nothing is copied out of it -- so these are
// really assertions about how a 200 and a 401 from /auth/me each surface.
describe('useAuth', () => {
  it('reports the reader as signed in once the session resolves', async () => {
    server.use(getAuthMeMockHandler({ id: 'a-user', email: 'reader@example.com', picture: null }));

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user?.email).toBe('reader@example.com');
  });

  it('reports the reader as signed out when the session is rejected', async () => {
    server.use(http.get('*/api/auth/me', () => new HttpResponse(null, { status: 401 })));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
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
