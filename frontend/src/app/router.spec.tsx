import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import {
  getBooksGetBookMockHandler,
  getBooksListBookEngagementsMockHandler,
  getBooksListBooksMockHandler,
} from '@/api/generated/books/books.msw';
import {
  getEngagementsGetEngagementMockHandler,
  getEngagementsListEngagementsMockHandler,
  getEngagementsListProgressLogsMockHandler,
} from '@/api/generated/engagements/engagements.msw';
import { destinations } from '@/config/destinations';
import { server } from '@/test/msw-server';
import { renderRoute, screen } from '@/test/render';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';

describe('the route tree', () => {
  it.each(destinations)('$to resolves to its own page, not the catch-all', async ({ to }) => {
    server.use(
      getAuthMeMockHandler(),
      getBooksListBooksMockHandler(),
      getEngagementsListEngagementsMockHandler()
    );

    renderRoute(to);

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).not.toHaveTextContent('Page not found');
  });

  it('/library/catalog renders its book list under the library nav', async () => {
    server.use(
      getAuthMeMockHandler(),
      getBooksListBooksMockHandler([buildBook({ title: 'Dune' })])
    );

    renderRoute('/library/catalog');

    expect(await screen.findByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Library' })).toBeVisible();
    expect(await screen.findByRole('listitem', { name: 'Dune' })).toBeVisible();
  });

  it.each([
    ['/library/tbr', 'To Read', ReadingStatus.tbr],
    ['/library/finished', 'Finished', ReadingStatus.finished],
    ['/library/dnf', 'DNF', ReadingStatus.dnf],
  ])('%s renders its own shelf under the library nav', async (path, title, status) => {
    const requested: string[] = [];

    server.use(
      getAuthMeMockHandler(),
      getEngagementsListEngagementsMockHandler(({ request }) => {
        requested.push(new URL(request.url).searchParams.get('status') ?? '');

        return [
          buildEngagement({
            title: 'Dune',
            status,
          }),
        ];
      })
    );

    renderRoute(path);

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Library' })).toBeVisible();
    expect(await screen.findByRole('listitem', { name: 'Dune' })).toBeVisible();
    expect(requested).toEqual([status]);
  });

  it('/reads/:engagementId renders the read named by the URL', async () => {
    server.use(
      getAuthMeMockHandler(),
      getEngagementsGetEngagementMockHandler(buildEngagement()),
      getEngagementsListProgressLogsMockHandler()
    );

    renderRoute('/reads/engagement-Piranesi');

    expect(await screen.findByRole('heading', { level: 1, name: 'Piranesi' })).toBeVisible();
  });

  it('/books/:bookId renders the book named by the URL', async () => {
    server.use(
      getAuthMeMockHandler(),
      getBooksGetBookMockHandler(buildBook()),
      getBooksListBookEngagementsMockHandler([])
    );

    renderRoute('/books/book-Piranesi');

    expect(await screen.findByRole('heading', { level: 1, name: 'Piranesi' })).toBeVisible();
  });

  it('replaces an unknown book with the error boundary rather than a broken page', async () => {
    server.use(
      getAuthMeMockHandler(),
      http.get('*/api/books/:bookId', () => new HttpResponse(null, { status: 404 }))
    );

    renderRoute('/books/missing');

    expect(await screen.findByRole('alert')).toBeVisible();
  });

  it('replaces a failed shelf with the error boundary and keeps the library nav', async () => {
    server.use(
      getAuthMeMockHandler(),
      http.get('*/api/books', () => new HttpResponse(null, { status: 500 }))
    );

    renderRoute('/library/catalog');

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Library' })).toBeVisible();
  });

  it('recovers a failed shelf in place when Try again is pressed', async () => {
    let attempts = 0;
    server.use(
      getAuthMeMockHandler(),
      getEngagementsListEngagementsMockHandler(),
      http.get('*/api/books', () => {
        attempts += 1;
        return attempts === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json([]);
      })
    );

    renderRoute('/library/catalog');

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('No books yet')).toBeVisible();
  });

  it('sends /library to the catalog, since it has no screen of its own', async () => {
    server.use(getAuthMeMockHandler(), getBooksListBooksMockHandler());

    renderRoute('/library');

    expect(await screen.findByRole('heading', { level: 1, name: 'Catalog' })).toBeVisible();
  });
});
