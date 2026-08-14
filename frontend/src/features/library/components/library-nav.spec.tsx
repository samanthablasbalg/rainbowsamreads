import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { server } from '@/test/msw-server';
import { renderRoute, screen } from '@/test/render';

describe('LibraryNav', () => {
  it('resolves its links against /library, not the current shelf', async () => {
    server.use(getAuthMeMockHandler());

    renderRoute('/library/finished');

    expect(await screen.findByRole('link', { name: 'To Read' })).toHaveAttribute(
      'href',
      '/library/tbr'
    );
  });

  it('marks only the current shelf as active', async () => {
    server.use(getAuthMeMockHandler());

    renderRoute('/library/finished');

    expect(await screen.findByRole('link', { name: 'Finished' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Catalog' })).not.toHaveAttribute('aria-current');
  });
});
