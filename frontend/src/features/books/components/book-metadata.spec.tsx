import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { render, screen } from '@/test/render';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { BookMetadata } from './book-metadata';
import {
  getBooksGetBookMockHandler,
  getBooksListBookEngagementsMockHandler,
} from '@/api/generated/books/books.msw';
import { server } from '@/test/msw-server';

describe('BookMetadata', () => {
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
});
