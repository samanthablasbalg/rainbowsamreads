import { HttpResponse, delay, http } from 'msw';
import userEvent from '@testing-library/user-event';
import { getBooksSearchBooksMockHandler } from '@/api/generated/books/books.msw';
import {
  BookSearchResultState,
  DatePrecision,
  type BookRead,
  type BookSearchResult,
} from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { SearchBar } from './search-bar';

function buildResult(overrides: Partial<BookSearchResult> = {}): BookSearchResult {
  return {
    state: BookSearchResultState.in_library,
    book_id: 'book-1',
    google_books_id: null,
    title: 'Piranesi',
    authors: ['Susanna Clarke'],
    published_date: null,
    page_count: null,
    categories: [],
    cover_url: null,
    language: null,
    status: null,
    ...overrides,
  };
}

function stubSearch(results: BookSearchResult[]) {
  const queries: string[] = [];
  server.use(
    getBooksSearchBooksMockHandler(({ request }) => {
      queries.push(new URL(request.url).searchParams.get('q') ?? '');
      return results;
    })
  );
  return queries;
}

function stubSearchFailure() {
  server.use(http.get('*/api/books/search', () => new HttpResponse(null, { status: 500 })));
}

function stubImport(book: Partial<BookRead> = {}) {
  server.use(
    http.post('*/api/books/import', () =>
      HttpResponse.json({
        id: 'book-9',
        title: 'The Left Hand of Darkness',
        authors: [{ id: 'author-9', name: 'Ursula K. Le Guin' }],
        google_books_id: 'gb-1',
        default_cover_url: null,
        default_page_count: 304,
        default_audio_minutes: null,
        original_language: null,
        genres: [],
        publication_date: null,
        publication_date_precision: DatePrecision.year,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        ...book,
      })
    )
  );
}

const catalogResult = buildResult({
  state: BookSearchResultState.in_catalog,
  book_id: 'book-2',
  title: 'Small Gods',
});

const googleResult = buildResult({
  state: BookSearchResultState.not_in_app,
  book_id: null,
  google_books_id: 'gb-1',
  title: 'The Left Hand of Darkness',
});

async function search(results: BookSearchResult[]) {
  stubSearch(results);
  const user = await expand();
  await user.type(screen.getByRole('combobox', { name: 'Search books' }), 'piranesi');
  await waitFor(() => expect(screen.getByRole('option', { name: /./ })).toBeVisible());
  return user;
}

async function expand() {
  const user = userEvent.setup();
  render(<SearchBar />);
  await user.click(screen.getByRole('button', { name: 'Search books' }));
  return user;
}

describe('SearchBar', () => {
  it('starts collapsed, as a button with no field', () => {
    render(<SearchBar />);

    expect(screen.getByRole('button', { name: 'Search books' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Search books' })).not.toBeInTheDocument();
  });

  it('expands into a focused field when the button is clicked', async () => {
    await expand();

    const input = screen.getByRole('combobox', { name: 'Search books' });
    expect(input).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Search books' })).not.toBeInTheDocument();
  });

  it('groups results under the section each one belongs to', async () => {
    stubSearch([
      buildResult(),
      buildResult({
        state: BookSearchResultState.in_catalog,
        book_id: 'book-2',
        title: 'Small Gods',
      }),
      buildResult({
        state: BookSearchResultState.not_in_app,
        book_id: null,
        google_books_id: 'gb-1',
        title: 'The Left Hand of Darkness',
      }),
    ]);

    const user = await expand();
    await user.type(screen.getByRole('combobox', { name: 'Search books' }), 'piranesi');

    await waitFor(() => expect(screen.getByRole('option', { name: /Piranesi/ })).toBeVisible());
    expect(screen.getByText('In your library')).toBeInTheDocument();
    expect(screen.getByText('Already in the app')).toBeInTheDocument();
    expect(screen.getByText('New — from Google Books')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Small Gods/ })).toBeVisible();
    expect(screen.getByRole('option', { name: /Left Hand/ })).toBeVisible();
  });

  it('does not search on a single character', async () => {
    const queries = stubSearch([buildResult()]);

    const user = await expand();
    await user.type(screen.getByRole('combobox', { name: 'Search books' }), 'p');

    await waitFor(() => expect(queries).toEqual([]));
  });

  it('reports a failed search instead of showing an empty list', async () => {
    stubSearchFailure();

    const user = await expand();
    await user.type(screen.getByRole('combobox', { name: 'Search books' }), 'piranesi');

    await waitFor(() =>
      expect(screen.getByText('Search failed — please try again.')).toBeVisible()
    );
  });

  it('says so when a search matches nothing', async () => {
    stubSearch([]);

    const user = await expand();
    await user.type(screen.getByRole('combobox', { name: 'Search books' }), 'piranesi');

    await waitFor(() => expect(screen.getByText('No results.')).toBeVisible());
  });

  it('collapses back to the button on Escape', async () => {
    stubSearch([buildResult()]);

    const user = await expand();
    await user.type(screen.getByRole('combobox', { name: 'Search books' }), 'piranesi');
    await waitFor(() => expect(screen.getByRole('option', { name: /Piranesi/ })).toBeVisible());

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Search books' })).toBeInTheDocument()
    );
    expect(screen.queryByRole('combobox', { name: 'Search books' })).not.toBeInTheDocument();
  });

  it('reopens blank, with the previous query and its results gone', async () => {
    stubSearch([buildResult()]);

    const user = await expand();
    await user.type(screen.getByRole('combobox', { name: 'Search books' }), 'piranesi');
    await waitFor(() => expect(screen.getByRole('option', { name: /Piranesi/ })).toBeVisible());

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Search books' })).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: 'Search books' }));

    expect(screen.getByRole('combobox', { name: 'Search books' })).toHaveValue('');
    expect(screen.queryByRole('option', { name: /Piranesi/ })).not.toBeInTheDocument();
  });

  it('does not show the last search results against a new query after reopening', async () => {
    const queries: string[] = [];
    server.use(
      getBooksSearchBooksMockHandler(async ({ request }) => {
        const q = new URL(request.url).searchParams.get('q') ?? '';
        queries.push(q);
        if (q.startsWith('gideon')) return [buildResult({ title: 'Gideon the Ninth' })];
        await delay('infinite');
        return [];
      })
    );

    const user = await expand();
    await user.type(screen.getByRole('combobox', { name: 'Search books' }), 'gideon');
    await waitFor(() => expect(screen.getByRole('option', { name: /Gideon/ })).toBeVisible());

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Search books' })).toBeInTheDocument()
    );
    await user.click(screen.getByRole('button', { name: 'Search books' }));
    await user.type(screen.getByRole('combobox', { name: 'Search books' }), 'dune');

    await waitFor(() => expect(queries).toContain('dune'));
    expect(screen.queryByRole('option', { name: /Gideon/ })).not.toBeInTheDocument();
  });

  describe('adding a book already in the app', () => {
    it('collapses the bar and asks how to add it', async () => {
      const user = await search([catalogResult]);

      await user.click(screen.getByRole('button', { name: 'Add Small Gods to your library' }));

      expect(await screen.findByRole('dialog')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Add Small Gods as Reading' })).toBeVisible();

      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: 'Search books' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Small Gods/ })).not.toBeInTheDocument();
    });
  });

  describe('importing a book from Google Books', () => {
    it('imports, collapses, then offers to add the imported book', async () => {
      stubImport();
      const user = await search([googleResult]);

      await user.click(screen.getByRole('button', { name: 'Import The Left Hand of Darkness' }));

      expect(await screen.findByRole('dialog')).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Add The Left Hand of Darkness as Reading' })
      ).toBeVisible();
      expect(screen.getByRole('button', { name: 'No thanks — just import' })).toBeVisible();
    });

    it('leaves the book imported when the add is declined', async () => {
      stubImport();
      const user = await search([googleResult]);

      await user.click(screen.getByRole('button', { name: 'Import The Left Hand of Darkness' }));
      await user.click(await screen.findByRole('button', { name: 'No thanks — just import' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: 'Search books' })).toBeInTheDocument();
    });

    it('keeps the results up and reports a failed import', async () => {
      server.use(http.post('*/api/books/import', () => new HttpResponse(null, { status: 502 })));
      const user = await search([googleResult]);

      await user.click(screen.getByRole('button', { name: 'Import The Left Hand of Darkness' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Import failed — please try again.'
      );
      expect(screen.getByRole('option', { name: /Left Hand/ })).toBeVisible();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
