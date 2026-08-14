import { getBooksListBooksMockHandler } from '@/api/generated/books/books.msw';
import { DatePrecision, type BookRead } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { Catalog } from './catalog';

function buildBook(title: string): BookRead {
  return {
    id: `book-${title}`,
    title,
    authors: [{ id: 'author-1', name: 'Susanna Clarke' }],
    google_books_id: null,
    default_cover_url: null,
    default_page_count: 272,
    default_audio_minutes: null,
    original_language: null,
    genres: [],
    publication_date: null,
    publication_date_precision: DatePrecision.year,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };
}

describe('Catalog', () => {
  it('renders a row per book in the order the API returns them', async () => {
    server.use(getBooksListBooksMockHandler([buildBook('Dune'), buildBook('Piranesi')]));

    render(<Catalog />);

    expect(await screen.findByRole('listitem', { name: 'Dune' })).toBeVisible();
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual(['Dune', 'Piranesi']);
  });

  it('shows an empty state when there are no books', async () => {
    server.use(getBooksListBooksMockHandler([]));

    render(<Catalog />);

    expect(await screen.findByText('No books yet')).toBeVisible();
  });

  it('shows a pending state while the list loads', () => {
    server.use(getBooksListBooksMockHandler([]));

    render(<Catalog />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('keeps a heading in the accessibility tree', async () => {
    server.use(getBooksListBooksMockHandler([]));

    render(<Catalog />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Catalog' })).toBeInTheDocument();
  });
});
