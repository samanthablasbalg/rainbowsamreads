import userEvent from '@testing-library/user-event';
import { ReadingStatus, type BookRecommendationRead } from '@/api/generated/readingTracker.schemas';
import { render, screen, waitFor } from '@/test/render';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { BookMetadata } from './book-metadata';
import {
  getBooksAddRecommenderMockHandler,
  getBooksDeleteRecommendationMockHandler,
  getBooksGetBookMockHandler,
  getBooksListBookEngagementsMockHandler,
  getBooksListBookRecommendationsMockHandler,
} from '@/api/generated/books/books.msw';
import { getRecommendersListRecommendersMockHandler } from '@/api/generated/recommenders/recommenders.msw';
import { server } from '@/test/msw-server';

const recommendation: BookRecommendationRead = {
  recommender: { id: 'recommender-1', name: 'James Baldwin' },
  note: null,
};

describe('BookMetadata', () => {
  beforeEach(() => {
    server.use(
      getBooksListBookRecommendationsMockHandler([]),
      getRecommendersListRecommendersMockHandler([])
    );
  });

  it('rates the book as the average of every read of it', async () => {
    const book = buildBook();
    const engagements = [
      buildEngagement({ id: 'engagement-1', review: { rating: '5.00', body: null } }),
      buildEngagement({ id: 'engagement-2', review: { rating: '4.00', body: null } }),
      buildEngagement({ id: 'engagement-3', review: null }),
    ];
    server.use(
      getBooksGetBookMockHandler(book),
      getBooksListBookEngagementsMockHandler(engagements)
    );

    render(<BookMetadata book={book} engagements={engagements} />);

    expect(await screen.findByRole('img', { name: 'Rated 4.5 out of 5' })).toBeVisible();
  });

  it.each([
    { status: ReadingStatus.tbr, label: 'To read' },
    { status: ReadingStatus.reading, label: 'Reading' },
  ])(
    'sends the open $label engagement over a more recently updated ending',
    async ({ status, label }) => {
      const engagements = [
        buildEngagement({
          id: 'ended-engagement',
          status: ReadingStatus.finished,
          updated_at: '2026-09-30T12:00:00Z',
        }),
        buildEngagement({
          id: 'open-engagement',
          status,
          updated_at: '2026-09-29T12:00:00Z',
        }),
      ];
      render(<BookMetadata book={buildBook()} engagements={engagements} />);

      expect(await screen.findByRole('button', { name: `Status: ${label}` })).toBeVisible();
    }
  );

  it('renders a recommender combobox when the row is empty', async () => {
    render(<BookMetadata book={buildBook()} engagements={[]} />);

    expect(await screen.findByRole('combobox')).toHaveAttribute('placeholder', 'Add...');
  });

  it('prepopulates the complete recommender list in alphabetical order', async () => {
    const user = userEvent.setup();
    server.use(
      getRecommendersListRecommendersMockHandler([
        { id: 'recommender-3', name: 'Octavia Butler' },
        { id: 'recommender-1', name: 'James Baldwin' },
        { id: 'recommender-2', name: 'Mary Oliver' },
      ])
    );

    render(<BookMetadata book={buildBook()} engagements={[]} />);

    await user.click(await screen.findByRole('combobox'));

    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      'James Baldwin',
      'Mary Oliver',
      'Octavia Butler',
    ]);
  });

  it('adds a selected existing recommender', async () => {
    const user = userEvent.setup();
    let recommendations: BookRecommendationRead[] = [];
    let sent: unknown;
    server.use(
      getRecommendersListRecommendersMockHandler([recommendation.recommender]),
      getBooksListBookRecommendationsMockHandler(() => recommendations),
      getBooksAddRecommenderMockHandler(async ({ request }) => {
        sent = await request.json();
        recommendations = [recommendation];
        return recommendation;
      })
    );

    render(<BookMetadata book={buildBook()} engagements={[]} />);

    await user.click(await screen.findByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'James Baldwin' }));

    await waitFor(() => expect(sent).toEqual({ name: 'James Baldwin' }));
    expect(await screen.findByText('James Baldwin')).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('adds a new recommender from the empty result', async () => {
    const user = userEvent.setup();
    const newRecommendation: BookRecommendationRead = {
      recommender: { id: 'recommender-2', name: 'Toni Morrison' },
      note: null,
    };
    let recommendations: BookRecommendationRead[] = [];
    let sent: unknown;
    server.use(
      getBooksListBookRecommendationsMockHandler(() => recommendations),
      getBooksAddRecommenderMockHandler(async ({ request }) => {
        sent = await request.json();
        recommendations = [newRecommendation];
        return newRecommendation;
      })
    );

    render(<BookMetadata book={buildBook()} engagements={[]} />);

    await user.type(await screen.findByRole('combobox'), 'Toni Morrison');
    await user.click(await screen.findByRole('button', { name: 'Add “Toni Morrison”' }));

    await waitFor(() => expect(sent).toEqual({ name: 'Toni Morrison' }));
    expect(await screen.findByText('Toni Morrison')).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows one recommender and removes the recommendation', async () => {
    const user = userEvent.setup();
    let recommendations = [recommendation];
    let deletedId: unknown;
    server.use(
      getBooksListBookRecommendationsMockHandler(() => recommendations),
      getBooksDeleteRecommendationMockHandler(({ params }) => {
        deletedId = params.recommenderId;
        recommendations = [];
      })
    );

    render(<BookMetadata book={buildBook()} engagements={[]} />);

    expect(await screen.findByText('James Baldwin')).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Remove recommendation by James Baldwin' })
    );

    expect(await screen.findByRole('combobox')).toBeVisible();
    expect(deletedId).toBe('recommender-1');
  });
});
