import { getBooksGetBookMockHandler } from '@/api/generated/books/books.msw';
import { DatePrecision } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { buildBook } from '@/test/data-generators';
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
      )
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
      )
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByText('March 2019')).toBeVisible();
  });

  it('renders a year-precise publication date as the bare year', async () => {
    server.use(
      getBooksGetBookMockHandler(
        buildBook({
          default_page_count: null,
          publication_date: '2019-01-01',
          publication_date_precision: DatePrecision.year,
        })
      )
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByText('2019')).toBeVisible();
  });

  it('omits facts the book does not have', async () => {
    server.use(
      getBooksGetBookMockHandler(
        buildBook({ default_page_count: null, default_audio_minutes: null })
      )
    );

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByRole('heading', { name: 'Piranesi' })).toBeVisible();
    expect(screen.queryByText(/pages/)).not.toBeInTheDocument();
  });

  it('falls back to the raw code for a language Intl cannot parse', async () => {
    server.use(getBooksGetBookMockHandler(buildBook({ original_language: 'not a tag' })));

    render(<BookDetail bookId="book-Piranesi" />);

    expect(await screen.findByText(/not a tag/)).toBeVisible();
  });
});
