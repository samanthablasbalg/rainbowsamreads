import { HttpResponse, http } from 'msw';
import userEvent from '@testing-library/user-event';
import { getBooksDeleteBookMockHandler } from '@/api/generated/books/books.msw';
import type { BookRead } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { buildBook } from '@/test/data-generators';
import { CatalogRow } from './catalog-row';

function renderInList(book: BookRead) {
  return render(
    <ul>
      <CatalogRow book={book} />
    </ul>
  );
}

async function chooseDelete(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));
  await user.click(await screen.findByRole('menuitem', { name: 'Delete Piranesi' }));
}

describe('CatalogRow', () => {
  it('renders the title and author on a listitem named for the book', () => {
    renderInList(buildBook());

    expect(screen.getByRole('listitem', { name: 'Piranesi' })).toHaveTextContent('Susanna Clarke');
  });

  it('joins multiple authors with a comma', () => {
    renderInList(
      buildBook({
        authors: [
          { id: 'author-1', name: 'Terry Pratchett' },
          { id: 'author-2', name: 'Neil Gaiman' },
        ],
      })
    );

    expect(screen.getByRole('listitem')).toHaveTextContent('Terry Pratchett, Neil Gaiman');
  });

  it('shows both lengths when the book has a page count and an audio length', () => {
    renderInList(buildBook({ default_page_count: 272, default_audio_minutes: 512 }));

    expect(screen.getByText('272 pages · 8h 32m')).toBeVisible();
  });

  it('says "1 page" for a one-page book', () => {
    renderInList(buildBook({ default_page_count: 1 }));

    expect(screen.getByText('1 page')).toBeVisible();
  });

  it('drops the minutes from an audio length that is a whole number of hours', () => {
    renderInList(buildBook({ default_page_count: null, default_audio_minutes: 120 }));

    expect(screen.getByText('2h')).toBeVisible();
  });

  it('drops the hours from an audio length under an hour', () => {
    renderInList(buildBook({ default_page_count: null, default_audio_minutes: 45 }));

    expect(screen.getByText('45m')).toBeVisible();
  });

  it('shows no length line when the book has neither a page count nor an audio length', () => {
    renderInList(buildBook({ default_page_count: null, default_audio_minutes: null }));

    const card = screen.getByRole('listitem');
    expect(card).toHaveTextContent('Susanna Clarke');
    expect(card).not.toHaveTextContent('page');
  });

  // Mark as reading opens the picker rather than starting a read: the format is what
  // chooses the edition the engagement binds to.
  it('opens the format picker from Mark as reading', async () => {
    const user = userEvent.setup();
    renderInList(buildBook());

    await user.click(screen.getByRole('button', { name: 'Mark Piranesi as reading' }));

    expect(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Print' })
    ).toBeVisible();
  });

  it('deletes the book, after confirming, when Delete is chosen', async () => {
    const user = userEvent.setup();
    server.use(getBooksDeleteBookMockHandler());
    renderInList(buildBook());

    await chooseDelete(user);
    expect(await screen.findByRole('dialog', { name: 'Delete "Piranesi"?' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // No MSW handler registered for this one -- the suite's onUnhandledRequest: 'error'
  // means a mutation firing anyway would fail the test, not just an assertion missing.
  it('leaves the book alone when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderInList(buildBook());

    await chooseDelete(user);
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // The 409 is the ordinary outcome here -- the backend refuses while any read still
  // points at the book -- so the row has to say which one it hit rather than assuming.
  it('shows the backend reason when the book cannot be deleted', async () => {
    const user = userEvent.setup();
    server.use(
      http.delete('*/api/books/:bookId', () =>
        HttpResponse.json({ detail: 'This book still has reads attached to it.' }, { status: 409 })
      )
    );
    renderInList(buildBook());

    await chooseDelete(user);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This book still has reads attached to it.'
    );
  });

  it('falls back to a generic message when a delete error has no detail', async () => {
    const user = userEvent.setup();
    server.use(http.delete('*/api/books/:bookId', () => new HttpResponse(null, { status: 500 })));
    renderInList(buildBook());

    await chooseDelete(user);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't delete this book. Please try again."
    );
  });
});
