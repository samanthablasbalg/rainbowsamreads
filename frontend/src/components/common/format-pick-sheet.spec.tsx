import { useState } from 'react';
import { HttpResponse, http } from 'msw';
import { useLocation } from 'react-router';
import userEvent from '@testing-library/user-event';
import {
  getEngagementsCreateEngagementMockHandler,
  getEngagementsCreateEngagementResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import { EngagementCreateStatus } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { localIsoDate } from '@/utils/local-date';
import { FormatPickSheet } from './format-pick-sheet';

type SheetProps = Omit<React.ComponentProps<typeof FormatPickSheet>, 'open' | 'onOpenChange'>;

const baseBook: SheetProps = { bookId: 'book-1', title: 'Piranesi', audioMinutes: null };

function ControlledFormatPickSheet(props: SheetProps) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <p>path: {useLocation().pathname}</p>
      <FormatPickSheet {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderSheet(props: Partial<SheetProps> = {}) {
  return render(<ControlledFormatPickSheet {...baseBook} {...props} />);
}

const ALL_STATUSES = [
  EngagementCreateStatus.reading,
  EngagementCreateStatus.finished,
  EngagementCreateStatus.dnf,
];

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
    renderSheet();

    expect(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Print' })
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start reading Piranesi as Digital' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start reading Piranesi as Audio' })).toBeVisible();
  });

  it('starts a print read immediately and navigates to Currently reading', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet();

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Print' })
    );

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-1',
      status: 'reading',
      edition_format: 'print',
      started_on: localIsoDate(),
    });
  });

  it('starts a digital read without asking for a length', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet();

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Digital' })
    );

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-1',
      status: 'reading',
      edition_format: 'digital',
      started_on: localIsoDate(),
    });
  });

  it('starts an audio read immediately when the book already has a length', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet({ audioMinutes: 600 });

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Audio' })
    );

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-1',
      status: 'reading',
      edition_format: 'audio',
      started_on: localIsoDate(),
    });
  });

  it('asks for a length when the book has no audio length, and sends it as minutes', async () => {
    const user = userEvent.setup();
    const captured = captureCreateBody();
    renderSheet();

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Audio' })
    );
    await user.type(screen.getByLabelText('How long is the audiobook?'), '10:30');
    await user.click(screen.getByRole('button', { name: 'Start reading Piranesi as Audio' }));

    await waitFor(() => expect(screen.getByText('path: /home')).toBeInTheDocument());
    expect(captured.body).toEqual({
      book_id: 'book-1',
      status: 'reading',
      edition_format: 'audio',
      started_on: localIsoDate(),
      edition_length: 630,
    });
  });

  it('keeps the start button disabled until the length parses as HH:MM', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Audio' })
    );
    const startButton = screen.getByRole('button', { name: 'Start reading Piranesi as Audio' });
    expect(startButton).toBeDisabled();

    await user.type(screen.getByLabelText('How long is the audiobook?'), '75');
    await user.tab();

    expect(startButton).toBeDisabled();
    expect(screen.getByText('Enter a length in HH:MM format')).toBeVisible();
  });

  it('returns to the format list from the length step, with the typed length dropped', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Audio' })
    );
    await user.type(screen.getByLabelText('How long is the audiobook?'), '10:30');
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(screen.getByRole('button', { name: 'Start reading Piranesi as Print' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Start reading Piranesi as Audio' }));
    expect(screen.getByLabelText('How long is the audiobook?')).toHaveValue('');
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

    await user.click(
      await screen.findByRole('button', { name: 'Start reading Piranesi as Print' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Already have a print engagement in progress for this book.'
    );
    expect(screen.getByText('path: /')).toBeInTheDocument();
  });

  describe('with a choice of status', () => {
    it('asks for a status before the format', async () => {
      renderSheet({ statuses: ALL_STATUSES });

      expect(await screen.findByRole('button', { name: 'Add Piranesi as Reading' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Add Piranesi as Finished' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Add Piranesi as DNF' })).toBeVisible();
      expect(screen.queryByRole('button', { name: /as Print$/ })).not.toBeInTheDocument();
    });

    it('sends the chosen status and lands on that shelf', async () => {
      const user = userEvent.setup();
      const captured = captureCreateBody();
      renderSheet({ statuses: ALL_STATUSES });

      await user.click(await screen.findByRole('button', { name: 'Add Piranesi as Finished' }));
      await user.click(screen.getByRole('button', { name: 'Add Piranesi as Finished in Print' }));

      await waitFor(() => expect(screen.getByText('path: /library/finished')).toBeInTheDocument());
      expect(captured.body).toEqual({
        book_id: 'book-1',
        status: 'finished',
        edition_format: 'print',
        started_on: localIsoDate(),
      });
    });

    it('lands on the DNF shelf for a DNF', async () => {
      const user = userEvent.setup();
      captureCreateBody();
      renderSheet({ statuses: ALL_STATUSES });

      await user.click(await screen.findByRole('button', { name: 'Add Piranesi as DNF' }));
      await user.click(screen.getByRole('button', { name: 'Add Piranesi as DNF in Digital' }));

      await waitFor(() => expect(screen.getByText('path: /library/dnf')).toBeInTheDocument());
    });

    it('uses the caller-supplied cancel label', async () => {
      renderSheet({ statuses: ALL_STATUSES, cancelLabel: 'No thanks — just import' });

      expect(await screen.findByRole('button', { name: 'No thanks — just import' })).toBeVisible();
    });
  });
});
