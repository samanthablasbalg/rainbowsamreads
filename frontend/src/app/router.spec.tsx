import { userEvent } from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
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
import { getInsightsGetStreakMockHandler } from '@/api/generated/insights/insights.msw';
import { destinations } from '@/config/destinations';
import { expectConsoleError } from '@/test/setup';
import { server } from '@/test/msw-server';
import { renderRoute, screen, waitFor } from '@/test/render';
import { buildBook, buildCatalogBook, buildEngagement } from '@/test/data-generators';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';

describe('the route tree', () => {
  it('shows the shared pending state while route data loads', async () => {
    const catalogRequested = vi.fn();
    server.use(
      getAuthMeMockHandler(),
      getBooksListBooksMockHandler(async () => {
        catalogRequested();
        await delay('infinite');
        return [];
      })
    );

    renderRoute('/library/catalog');

    await waitFor(() => expect(catalogRequested).toHaveBeenCalledOnce());
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it.each(destinations)('$to resolves to its own page, not the catch-all', async ({ to }) => {
    server.use(
      getAuthMeMockHandler(),
      getBooksListBooksMockHandler(),
      getEngagementsListEngagementsMockHandler(),
      getInsightsGetStreakMockHandler()
    );

    renderRoute(to);

    const heading = await screen.findByRole('heading', { level: 1 }, { timeout: 3_000 });
    expect(heading).not.toHaveTextContent('Page not found');
  });

  it('/library/catalog renders its book list under the library nav', async () => {
    server.use(
      getAuthMeMockHandler(),
      getBooksListBooksMockHandler([buildCatalogBook({ title: 'Dune' })])
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
      getEngagementsListProgressLogsMockHandler([])
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
    expectConsoleError('Request failed with status code 404', '<BookDetail>');
    server.use(
      getAuthMeMockHandler(),
      getBooksListBookEngagementsMockHandler([]),
      http.get('*/api/books/:bookId', () => new HttpResponse(null, { status: 404 }))
    );

    renderRoute('/books/missing');

    expect(await screen.findByRole('alert')).toBeVisible();
  });

  it('replaces a failed shelf with the error boundary and keeps the library nav', async () => {
    expectConsoleError('Request failed with status code 500', '<Catalog>');
    server.use(
      getAuthMeMockHandler(),
      http.get('*/api/books', () => new HttpResponse(null, { status: 500 }))
    );

    renderRoute('/library/catalog');

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Library' })).toBeVisible();
  });

  it('recovers a failed shelf in place when Try again is pressed', async () => {
    expectConsoleError('Request failed with status code 500', '<Catalog>');
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

  it('/library redirects to tbr', async () => {
    server.use(getAuthMeMockHandler(), getEngagementsListEngagementsMockHandler());

    renderRoute('/library');

    expect(await screen.findByRole('heading', { level: 1, name: 'To Read' })).toBeVisible();
  });
});
