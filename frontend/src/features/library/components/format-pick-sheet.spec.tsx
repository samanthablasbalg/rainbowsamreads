import { useState } from 'react';
import { HttpResponse, http } from 'msw';
import { useLocation } from 'react-router';
import userEvent from '@testing-library/user-event';
import {
  getEngagementsCreateEngagementMockHandler,
  getEngagementsCreateEngagementResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import { DatePrecision, type BookRead } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { localIsoDate } from '@/utils/local-date';
import { FormatPickSheet } from './format-pick-sheet';

function buildBook(overrides: Partial<BookRead> = {}): BookRead {
  return {
    id: 'book-1',
    title: 'Piranesi',
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
    ...overrides,
  };
}

// The sheet is controlled the way CatalogRow drives it, and renders the router's
// current path beside it -- the success path navigates, and MemoryRouter has nothing
// else mounted to show where it landed.
function ControlledFormatPickSheet({ book }: { book: BookRead }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <p>path: {useLocation().pathname}</p>
      <FormatPickSheet book={book} open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderSheet(book: BookRead) {
  return render(<ControlledFormatPickSheet book={book} />);
}

function captureCreateBody() {
  const captured: { body?: unknown } = {};
  server.use(
    getEngagementsCreateEngagementMockHandler(async (info) => {
      captured.body = await info.request.json();
      return getEngagementsCreateEngagementResponseMock();
    })
  );
  return captured;
}

describe('FormatPickSheet', () => {
  it('offers all three formats', async () => {
    renderSheet(buildBook());

    expect(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Print' })
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start reading Piranesi as Digital' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start reading Piranesi as Audio' })).toBeVisible();
  });

  it('starts a print read immediately and navigates to Currently reading', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet(buildBook());

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Print' })
    );

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-1',
      edition_format: 'print',
      started_on: localIsoDate(),
    });
  });

  it('starts a digital read without asking for a length', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet(buildBook({ default_page_count: null }));

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Digital' })
    );

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-1',
      edition_format: 'digital',
      started_on: localIsoDate(),
    });
  });

  it('starts an audio read immediately when the book already has a length', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet(buildBook({ default_audio_minutes: 600 }));

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Audio' })
    );

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-1',
      edition_format: 'audio',
      started_on: localIsoDate(),
    });
  });

  it('asks for a length when the book has no audio length, and sends it as minutes', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet(buildBook());

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Audio' })
    );
    await user.type(screen.getByLabelText('How long is the audiobook?'), '10:30');
    await user.click(screen.getByRole('button', { name: 'Start reading Piranesi as Audio' }));

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-1',
      edition_format: 'audio',
      started_on: localIsoDate(),
      audio_length_minutes: 630,
    });
  });

  it('keeps the start button disabled until the length parses as HH:MM', async () => {
    const user = userEvent.setup();
    renderSheet(buildBook());

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Audio' })
    );
    const startButton = screen.getByRole('button', { name: 'Start reading Piranesi as Audio' });
    expect(startButton).toBeDisabled();

    await user.type(screen.getByLabelText('How long is the audiobook?'), '600');
    await user.tab();

    expect(startButton).toBeDisabled();
    expect(screen.getByText('Enter a length in HH:MM format')).toBeVisible();
  });

  it('returns to the format list from the length step, with the typed length dropped', async () => {
    const user = userEvent.setup();
    renderSheet(buildBook());

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Audio' })
    );
    await user.type(screen.getByLabelText('How long is the audiobook?'), '10:30');
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('button', { name: 'Start reading Piranesi as Print' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Start reading Piranesi as Audio' }));
    expect(screen.getByLabelText('How long is the audiobook?')).toHaveValue('');
  });

  // The catalog is the screen most likely to hit this: the backend refuses a second
  // reading engagement for the same book and format, and refuses a format the book has
  // no edition for. Either way the sheet has to stay open and say why.
  it('shows the failure reason and stays open when the read cannot be started', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/api/engagements', () =>
        HttpResponse.json(
          { detail: 'Already have a print engagement in progress for this book.' },
          { status: 409 }
        )
      )
    );
    renderSheet(buildBook());

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Print' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Already have a print engagement in progress for this book.'
    );
    expect(screen.getByText('path: /')).toBeInTheDocument();
  });
});
