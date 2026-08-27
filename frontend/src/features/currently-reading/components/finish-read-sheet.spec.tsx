import { useState } from 'react';
import { HttpResponse, http } from 'msw';
import userEvent from '@testing-library/user-event';
import {
  getEngagementsUpdateEngagementStatusMockHandler,
  getEngagementsUpdateEngagementStatusResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import { Format, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { buildAudioEngagement, buildEngagement } from '@/test/data-generators';
import { server } from '@/test/msw-server';
import { fireEvent, render, screen, waitFor } from '@/test/render';
import { localIsoDate } from '@/utils/local-date';
import { FinishReadSheet } from './finish-read-sheet';

function buildMixedEngagement() {
  return buildEngagement({
    formats: [Format.print, Format.audio],
    length_minutes: 600,
    frontier_minute: 600,
  });
}

function ControlledSheet({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      {!open && <p>closed</p>}
      <FinishReadSheet engagement={engagement} open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderSheet(engagement: EngagementRead = buildEngagement()) {
  return render(<ControlledSheet engagement={engagement} />);
}

function captureStatusBody() {
  const captured: { body?: unknown } = {};
  server.use(
    getEngagementsUpdateEngagementStatusMockHandler(async (info) => {
      captured.body = await info.request.json();
      return getEngagementsUpdateEngagementStatusResponseMock();
    })
  );
  return captured;
}

const finish = { name: 'Mark Piranesi as finished' };

describe('FinishReadSheet', () => {
  it('finishes a single-format read on today, saying nothing about a ruler', async () => {
    const user = userEvent.setup();
    const captured = captureStatusBody();
    renderSheet();

    expect(await screen.findByLabelText('Finish date')).toHaveValue(localIsoDate());
    expect(screen.queryByRole('group', { name: 'Closing entry format' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', finish));

    await waitFor(() => expect(screen.getByText('closed')).toBeInTheDocument());
    expect(captured.body).toEqual({ status: 'finished', effective_on: localIsoDate() });
  });

  it('sends the date picked instead of today', async () => {
    const user = userEvent.setup();
    const captured = captureStatusBody();
    renderSheet();

    fireEvent.change(await screen.findByLabelText('Finish date'), {
      target: { value: '2025-06-15' },
    });
    await user.click(screen.getByRole('button', finish));

    await waitFor(() => expect(screen.getByText('closed')).toBeInTheDocument());
    expect(captured.body).toEqual({ status: 'finished', effective_on: '2025-06-15' });
  });

  it('will not finish a date it has no answer for', async () => {
    renderSheet();

    fireEvent.change(await screen.findByLabelText('Finish date'), { target: { value: '' } });

    expect(screen.getByRole('button', finish)).toBeDisabled();
  });

  it('asks which ruler a two-format read ends on, and preselects neither', async () => {
    renderSheet(buildMixedEngagement());

    expect(await screen.findByRole('group', { name: 'Closing entry format' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Pages' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Minutes' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', finish)).toBeDisabled();
  });

  it('sends the ruler that was picked', async () => {
    const user = userEvent.setup();
    const captured = captureStatusBody();
    renderSheet(buildMixedEngagement());

    await user.click(await screen.findByRole('button', { name: 'Minutes' }));

    expect(screen.getByRole('button', { name: 'Minutes' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', finish));

    await waitFor(() => expect(screen.getByText('closed')).toBeInTheDocument());
    expect(captured.body).toEqual({
      status: 'finished',
      effective_on: localIsoDate(),
      unit: 'minutes',
    });
  });

  it('does not ask when both bound formats read off the same ruler', async () => {
    renderSheet(buildEngagement({ formats: [Format.print, Format.digital] }));

    await screen.findByRole('dialog');
    expect(screen.queryByRole('group', { name: 'Closing entry format' })).not.toBeInTheDocument();
  });

  it('does not ask an audio-only read which ruler it ended on', async () => {
    renderSheet(buildAudioEngagement());

    await screen.findByRole('dialog');
    expect(screen.queryByRole('group', { name: 'Closing entry format' })).not.toBeInTheDocument();
  });

  it('shows the failure reason and stays open when the finish is refused', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch('*/api/engagements/*', () =>
        HttpResponse.json({ detail: 'Cannot finish before the last session.' }, { status: 409 })
      )
    );
    renderSheet();

    await user.click(await screen.findByRole('button', finish));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot finish before the last session.'
    );
    expect(screen.queryByText('closed')).not.toBeInTheDocument();
  });
});
