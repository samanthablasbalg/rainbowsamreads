import { useState } from 'react';
import { HttpResponse, http } from 'msw';
import { useLocation } from 'react-router';
import userEvent from '@testing-library/user-event';
import {
  getEngagementsCreateEngagementMockHandler,
  getEngagementsCreateEngagementResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import type { BookRead } from '@/api/generated/readingTracker.schemas';
import { buildBook } from '@/test/data-generators';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { localIsoDate } from '@/utils/local-date';
import { StartReadingSheet } from './start-reading-sheet';

function ControlledSheet({ book }: { book: BookRead }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <p>path: {useLocation().pathname}</p>
      <StartReadingSheet book={book} open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderSheet(overrides: Partial<BookRead> = {}) {
  return render(<ControlledSheet book={buildBook(overrides)} />);
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

describe('StartReadingSheet', () => {
  it('starts a print read on the known length without touching a field', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet();

    await user.click(await screen.findByRole('button', { name: 'Start reading Piranesi' }));

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-Piranesi',
      status: 'reading',
      edition_format: 'print',
      started_on: localIsoDate(),
    });
  });

  it('shows the known page count as a placeholder rather than a filled value', async () => {
    renderSheet();

    const field = await screen.findByLabelText('Pages');
    expect(field).toHaveValue('');
    expect(field).toHaveAttribute('placeholder', '272');
  });

  it('sends a typed page count as a length override', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet();

    await user.type(await screen.findByLabelText('Pages'), '1000');
    await user.click(screen.getByRole('button', { name: 'Start reading Piranesi' }));

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-Piranesi',
      status: 'reading',
      edition_format: 'print',
      started_on: localIsoDate(),
      length_override: 1000,
    });
  });

  it('swaps to an HH:MM length for audio and drops what was typed for print', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.type(await screen.findByLabelText('Pages'), '1000');
    await user.click(screen.getByRole('button', { name: 'Audio' }));

    expect(screen.getByLabelText('Length')).toHaveValue('');
    expect(screen.queryByLabelText('Pages')).not.toBeInTheDocument();
  });

  it('requires a length for a format that has none, and captures it', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet();

    await user.click(await screen.findByRole('button', { name: 'Audio' }));
    const start = screen.getByRole('button', { name: 'Start reading Piranesi' });
    expect(start).toBeDisabled();

    await user.type(screen.getByLabelText('Length'), '10:30');
    await user.click(start);

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-Piranesi',
      status: 'reading',
      edition_format: 'audio',
      started_on: localIsoDate(),
      audio_length_minutes: 630,
    });
  });

  it('overrides rather than captures when the audio length is already known', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet({ default_audio_minutes: 600 });

    await user.click(await screen.findByRole('button', { name: 'Audio' }));
    expect(screen.getByLabelText('Length')).toHaveAttribute('placeholder', '10:00');

    await user.type(screen.getByLabelText('Length'), '11:00');
    await user.click(screen.getByRole('button', { name: 'Start reading Piranesi' }));

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-Piranesi',
      status: 'reading',
      edition_format: 'audio',
      started_on: localIsoDate(),
      length_override: 660,
    });
  });

  it('sends a customised start date', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet();

    await user.clear(await screen.findByLabelText('Start date'));
    await user.type(screen.getByLabelText('Start date'), '2026-01-15');
    await user.click(screen.getByRole('button', { name: 'Start reading Piranesi' }));

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-Piranesi',
      status: 'reading',
      edition_format: 'print',
      started_on: '2026-01-15',
    });
  });

  it('rejects a length that is not a number of pages', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.type(await screen.findByLabelText('Pages'), 'abc');
    await user.tab();

    expect(screen.getByText('Enter a number of pages')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start reading Piranesi' })).toBeDisabled();
  });

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
    renderSheet();

    await user.click(await screen.findByRole('button', { name: 'Start reading Piranesi' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Already have a print engagement in progress for this book.'
    );
    expect(screen.getByText('path: /')).toBeInTheDocument();
  });
});
