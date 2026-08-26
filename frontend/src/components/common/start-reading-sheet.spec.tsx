import { useState } from 'react';
import { HttpResponse, http } from 'msw';
import { useLocation, useNavigate } from 'react-router';
import userEvent from '@testing-library/user-event';
import {
  getEngagementsCreateEngagementMockHandler,
  getEngagementsCreateEngagementResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import { EngagementCreateStatus, type BookRead } from '@/api/generated/readingTracker.schemas';
import { buildBook } from '@/test/data-generators';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { localIsoDate } from '@/utils/local-date';
import { STATUSES } from '@/utils/status';
import { StartReadingSheet } from './start-reading-sheet';

// The sheet leaves navigation to whoever opened it, so the harness stands in for the
// catalog -- the caller that does send you to the Reading shelf once a read starts.
function ControlledSheet({ book }: { book: BookRead }) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  return (
    <>
      <p>path: {useLocation().pathname}</p>
      <StartReadingSheet
        book={book}
        open={open}
        onOpenChange={setOpen}
        onStarted={() => navigate(STATUSES.reading.to)}
      />
    </>
  );
}

function renderSheet(overrides: Partial<BookRead> = {}) {
  return render(<ControlledSheet book={buildBook(overrides)} />);
}

// Search's caller: three statuses to choose between, and no navigation once the read is
// added -- the bar is global, so you stay on whatever page you searched from.
function renderAddSheet(overrides: Partial<BookRead> = {}) {
  return render(
    <StartReadingSheet
      book={buildBook(overrides)}
      statuses={[
        EngagementCreateStatus.reading,
        EngagementCreateStatus.finished,
        EngagementCreateStatus.dnf,
      ]}
      open
      onOpenChange={() => {}}
    />
  );
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

  it('asks where the read goes before asking how it was read', async () => {
    renderAddSheet();

    expect(await screen.findByRole('button', { name: 'Add Piranesi as Finished' })).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Format' })).not.toBeInTheDocument();
  });

  it('goes straight to the format step when only one status is offered', async () => {
    renderSheet();

    expect(await screen.findByRole('group', { name: 'Format' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Add Piranesi as Finished' })
    ).not.toBeInTheDocument();
  });

  it('adds a finished read with both dates', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderAddSheet();

    await user.click(await screen.findByRole('button', { name: 'Add Piranesi as Finished' }));
    await user.type(screen.getByLabelText('Start date'), '2026-01-15');
    await user.type(screen.getByLabelText('Finish date'), '2026-02-20');
    await user.click(screen.getByRole('button', { name: 'Add Piranesi' }));

    await waitFor(() =>
      expect(captured.body).toEqual({
        book_id: 'book-Piranesi',
        status: 'finished',
        edition_format: 'print',
        started_on: '2026-01-15',
        finished_on: '2026-02-20',
      })
    );
  });

  it('adds a finished read you remember no dates for', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderAddSheet();

    await user.click(await screen.findByRole('button', { name: 'Add Piranesi as Finished' }));
    expect(screen.getByLabelText('Start date')).toHaveValue('');
    expect(screen.getByLabelText('Finish date')).toHaveValue('');

    await user.click(screen.getByRole('button', { name: 'Add Piranesi' }));

    await waitFor(() =>
      expect(captured.body).toEqual({
        book_id: 'book-Piranesi',
        status: 'finished',
        edition_format: 'print',
      })
    );
  });

  it('calls the end date "Stopped on" for a read that was abandoned', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderAddSheet();

    await user.click(await screen.findByRole('button', { name: 'Add Piranesi as DNF' }));
    await user.type(screen.getByLabelText('Stopped on'), '2026-02-20');
    await user.click(screen.getByRole('button', { name: 'Add Piranesi' }));

    await waitFor(() =>
      expect(captured.body).toEqual({
        book_id: 'book-Piranesi',
        status: 'dnf',
        edition_format: 'print',
        finished_on: '2026-02-20',
      })
    );
  });

  it('still prefills today and offers no end date when the read is starting now', async () => {
    const user = userEvent.setup();
    renderAddSheet();

    await user.click(await screen.findByRole('button', { name: 'Add Piranesi as Reading' }));

    expect(screen.getByLabelText('Start date')).toHaveValue(localIsoDate());
    expect(screen.queryByLabelText('Finish date')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start reading Piranesi' })).toBeVisible();
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
