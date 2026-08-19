import { getBooksListBooksMockHandler } from '@/api/generated/books/books.msw';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import { buildBook } from '@/test/data-generators';
import { Catalog } from './catalog';

describe('Catalog', () => {
  it('renders a row per book in the order the API returns them', async () => {
    server.use(
      getBooksListBooksMockHandler([buildBook({ title: 'Dune' }), buildBook({ title: 'Piranesi' })])
    );

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
