import userEvent from '@testing-library/user-event';
import { getBooksGetBookMockHandler } from '@/api/generated/books/books.msw';
import {
  getEngagementsListBookEngagementsMockHandler,
  getEngagementsUpdateEngagementStatusMockHandler,
  getEngagementsUpdateEngagementStatusResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import { DatePrecision, ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { localIsoDate } from '@/utils/local-date';
import { BookDetail } from './book-detail';

describe('BookDetail', () => {
  it('renders the book it was given the id of', async () => {
    server.use(
      getBooksGetBookMockHandler(
        buildBook({
          genres: ['Fantasy', 'Literary fiction'],
          default_page_count: 272,
          default_audio_minutes: 155,
          original_language: 'en',
        })
      ),
      getEngagementsListBookEngagementsMockHandler([])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByRole('heading', { name: 'Piranesi' })).toBeVisible();
    expect(screen.getByText('Susanna Clarke')).toBeVisible();
    expect(screen.getByText('Fantasy')).toBeVisible();
    expect(screen.getByText('Literary fiction')).toBeVisible();
    expect(screen.getByText('272 pages')).toBeVisible();
    expect(screen.getByText('2h 35m')).toBeVisible();
    expect(screen.getByText('English')).toBeVisible();
  });

  it('renders a month-precise publication date without inventing a day', async () => {
    server.use(
      getBooksGetBookMockHandler(
        buildBook({
          default_page_count: null,
          publication_date: '2019-03-01',
          publication_date_precision: DatePrecision.month,
        })
      ),
      getEngagementsListBookEngagementsMockHandler([])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByText(/March 2019/)).toBeVisible();
  });

  it('renders a year-precise publication date as the bare year', async () => {
    server.use(
      getBooksGetBookMockHandler(
        buildBook({
          default_page_count: null,
          publication_date: '2019-01-01',
          publication_date_precision: DatePrecision.year,
        })
      ),
      getEngagementsListBookEngagementsMockHandler([])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByText(/2019/)).toBeVisible();
  });

  it('omits facts the book does not have', async () => {
    server.use(
      getBooksGetBookMockHandler(
        buildBook({ default_page_count: null, default_audio_minutes: null })
      ),
      getEngagementsListBookEngagementsMockHandler([])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByRole('heading', { name: 'Piranesi' })).toBeVisible();
    expect(screen.queryByText(/pages/)).not.toBeInTheDocument();
  });

  it('falls back to the raw code for a language Intl cannot parse', async () => {
    server.use(
      getBooksGetBookMockHandler(buildBook({ original_language: 'not a tag' })),
      getEngagementsListBookEngagementsMockHandler([])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByText(/not a tag/)).toBeVisible();
  });

  it('rates the book as the average of every read of it', async () => {
    server.use(
      getBooksGetBookMockHandler(buildBook()),
      getEngagementsListBookEngagementsMockHandler([
        buildEngagement({ id: 'engagement-1', review: { rating: '5.00', body: null } }),
        buildEngagement({ id: 'engagement-2', review: { rating: '4.00', body: null } }),
        buildEngagement({ id: 'engagement-3', review: null }),
      ])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByRole('img', { name: 'Rated 4.5 out of 5' })).toBeVisible();
  });

  it('shows empty stars for a book nothing has rated', async () => {
    server.use(
      getBooksGetBookMockHandler(buildBook()),
      getEngagementsListBookEngagementsMockHandler([])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByRole('img', { name: 'Not rated' })).toBeVisible();
  });

  // The status menu is built from the generated `EngagementStatusUpdateStatus`, so this
  // pins the thing that matters: it offers what the endpoint accepts and nothing else.
  it('offers only the statuses the endpoint accepts', async () => {
    const user = userEvent.setup();
    server.use(
      getBooksGetBookMockHandler(buildBook()),
      getEngagementsListBookEngagementsMockHandler([
        buildEngagement({ status: ReadingStatus.reading }),
      ])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    await user.click(await screen.findByRole('button', { name: /Reading/ }));

    expect(await screen.findByRole('menuitem', { name: 'Reading' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'Finished' })).toBeVisible();
    expect(screen.getByRole('menuitem', { name: 'DNF' })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: 'Interested' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'To read' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Paused' })).not.toBeInTheDocument();
  });

  it('changes the status of the read the pill is showing', async () => {
    const user = userEvent.setup();
    const captured: { body?: unknown } = {};
    server.use(
      getBooksGetBookMockHandler(buildBook()),
      getEngagementsListBookEngagementsMockHandler([
        buildEngagement({ id: 'engagement-1', status: ReadingStatus.reading }),
      ]),
      getEngagementsUpdateEngagementStatusMockHandler(async (info) => {
        captured.body = await info.request.json();
        return getEngagementsUpdateEngagementStatusResponseMock();
      })
    );

    render(<BookDetail bookId="book-Piranesi" />);

    await user.click(await screen.findByRole('button', { name: /Reading/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Finished' }));

    await waitFor(() =>
      expect(captured.body).toEqual({ status: 'finished', effective_on: localIsoDate() })
    );
  });

  it('starts a read from an untracked book without leaving the page', async () => {
    const user = userEvent.setup();
    server.use(
      getBooksGetBookMockHandler(buildBook()),
      getEngagementsListBookEngagementsMockHandler([])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    await user.click(await screen.findByRole('button', { name: /Not tracked/ }));

    expect(await screen.findByRole('button', { name: 'Add Piranesi as Reading' })).toBeVisible();
  });

  it('logs another reading from the reading history', async () => {
    const user = userEvent.setup();
    server.use(
      getBooksGetBookMockHandler(buildBook()),
      getEngagementsListBookEngagementsMockHandler([buildEngagement()])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    await user.click(await screen.findByRole('button', { name: '+ Log a reading' }));

    expect(await screen.findByRole('button', { name: 'Add Piranesi as Finished' })).toBeVisible();
  });

  // Two of them would sit one above the other: the empty state's own button is the one to
  // keep, because it is the thing explaining why the list is empty.
  it('leaves the history heading without a log button until there is a history', async () => {
    server.use(
      getBooksGetBookMockHandler(buildBook()),
      getEngagementsListBookEngagementsMockHandler([])
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByRole('button', { name: 'Log a reading' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '+ Log a reading' })).not.toBeInTheDocument();
  });
});
