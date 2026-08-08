import { HttpResponse, http } from 'msw';
import userEvent from '@testing-library/user-event';
import { getBooksSearchBooksMockHandler } from '@/api/generated/books/books.msw';
import {
  BookSearchResultState,
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

// Returns the queries the bar actually sent, so the short-query test can assert on the
// absence of a request rather than on the absence of results -- which would pass while
// the debounce was still pending.
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
});
