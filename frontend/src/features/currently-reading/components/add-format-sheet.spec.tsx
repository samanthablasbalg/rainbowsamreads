import { useState } from 'react';
import { HttpResponse, http } from 'msw';
import userEvent from '@testing-library/user-event';
import {
  getEngagementsCreateBindingMockHandler,
  getEngagementsCreateBindingResponseMock,
} from '@/api/generated/engagements/engagements.msw';
import { Format, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { buildAudioEngagement, buildEngagement } from '@/test/data-generators';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { AddFormatSheet } from './add-format-sheet';

function ControlledSheet({ engagement }: { engagement: EngagementRead }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      {!open && <p>closed</p>}
      <AddFormatSheet engagement={engagement} open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderSheet(engagement: EngagementRead = buildEngagement()) {
  return render(<ControlledSheet engagement={engagement} />);
}

function captureBindingBody() {
  const captured: { body?: unknown } = {};
  server.use(
    getEngagementsCreateBindingMockHandler(async (info) => {
      captured.body = await info.request.json();
      return getEngagementsCreateBindingResponseMock();
    })
  );
  return captured;
}

describe('AddFormatSheet', () => {
  it('shows the format already being read rather than hiding it, with its length and spot', async () => {
    renderSheet(buildEngagement({ resume_from_page: 150 }));

    const print = await screen.findByText('Print');
    expect(print.parentElement).toHaveTextContent('272 pages · at p. 150');
    expect(print.closest('div')).toHaveTextContent('Reading');
    expect(screen.queryByRole('button', { name: /Print/ })).not.toBeInTheDocument();
  });

  it('says so when the bound format has nothing logged yet', async () => {
    renderSheet(buildEngagement({ resume_from_page: 0 }));

    expect(await screen.findByText(/nothing logged yet/)).toBeVisible();
  });

  it('starts with nothing picked, so no length is asked for and nothing can be added', async () => {
    renderSheet();

    expect(await screen.findByRole('button', { name: /Digital/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: /Audio/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByLabelText('Pages')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add format' })).toBeDisabled();
  });

  it('asks for a length only once a format is picked', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(await screen.findByRole('button', { name: /Digital/ }));

    expect(screen.getByLabelText('Pages')).toBeVisible();
    expect(screen.getByRole('button', { name: /Digital/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it("shows an addable format's known length, and says so when there is none", async () => {
    renderSheet();

    expect(await screen.findByRole('button', { name: /Digital/ })).toHaveTextContent('272 pages');
    expect(screen.getByRole('button', { name: /Audio/ })).toHaveTextContent('Length unknown');
  });

  it('binds the new format on the known length without touching a field', async () => {
    const user = userEvent.setup();
    const captured = captureBindingBody();
    renderSheet();

    await user.click(await screen.findByRole('button', { name: /Digital/ }));
    await user.click(screen.getByRole('button', { name: 'Add format' }));

    await waitFor(() => expect(screen.getByText('closed')).toBeInTheDocument());
    expect(captured.body).toEqual({ edition_format: 'digital' });
  });

  it('sends a typed page count as a length override', async () => {
    const user = userEvent.setup();
    const captured = captureBindingBody();
    renderSheet();

    await user.click(await screen.findByRole('button', { name: /Digital/ }));
    await user.type(screen.getByLabelText('Pages'), '310');
    await user.click(screen.getByRole('button', { name: 'Add format' }));

    await waitFor(() => expect(screen.getByText('closed')).toBeInTheDocument());
    expect(captured.body).toEqual({ edition_format: 'digital', length_override: 310 });
  });

  it('swaps to an HH:MM length for audio and drops what was typed for pages', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(await screen.findByRole('button', { name: /Digital/ }));
    await user.type(screen.getByLabelText('Pages'), '310');
    await user.click(screen.getByRole('button', { name: /Audio/ }));

    expect(screen.getByLabelText('Length')).toHaveValue('');
    expect(screen.queryByLabelText('Pages')).not.toBeInTheDocument();
  });

  it('requires a length for audio when the book has none, and captures it on the edition', async () => {
    const user = userEvent.setup();
    const captured = captureBindingBody();
    renderSheet();

    await user.click(await screen.findByRole('button', { name: /Audio/ }));
    const add = screen.getByRole('button', { name: 'Add format' });
    expect(add).toBeDisabled();

    await user.type(screen.getByLabelText('Length'), '10:30');
    await user.click(add);

    await waitFor(() => expect(screen.getByText('closed')).toBeInTheDocument());
    expect(captured.body).toEqual({ edition_format: 'audio', edition_length: 630 });
  });

  it('overrides rather than captures when the audio length is already known', async () => {
    const user = userEvent.setup();
    const captured = captureBindingBody();
    renderSheet(
      buildEngagement({
        book: { ...buildEngagement().book, default_audio_minutes: 600 },
      })
    );

    await user.click(await screen.findByRole('button', { name: /Audio/ }));
    expect(screen.getByLabelText('Length')).toHaveAttribute('placeholder', '10:00');

    await user.type(screen.getByLabelText('Length'), '11:00');
    await user.click(screen.getByRole('button', { name: 'Add format' }));

    await waitFor(() => expect(screen.getByText('closed')).toBeInTheDocument());
    expect(captured.body).toEqual({ edition_format: 'audio', length_override: 660 });
  });

  it('reads the bound audio row off the read, in its own ruler', async () => {
    renderSheet(buildAudioEngagement({ resume_from_minute: 220 }));

    const audio = await screen.findByText('Audio');
    expect(audio.parentElement).toHaveTextContent('10:00 · at 03:40');
    expect(screen.getByRole('button', { name: /Print/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('rejects a length that is not a number of pages', async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(await screen.findByRole('button', { name: /Digital/ }));
    await user.type(screen.getByLabelText('Pages'), 'abc');
    await user.tab();

    expect(screen.getByText('Enter a number of pages')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add format' })).toBeDisabled();
  });

  it('shows the failure reason and stays open when the format cannot be added', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('*/api/engagements/*/editions', () =>
        HttpResponse.json(
          { detail: 'This edition is already bound to this engagement.' },
          { status: 409 }
        )
      )
    );
    renderSheet();

    await user.click(await screen.findByRole('button', { name: /Digital/ }));
    await user.click(screen.getByRole('button', { name: 'Add format' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This edition is already bound to this engagement.'
    );
    expect(screen.queryByText('closed')).not.toBeInTheDocument();
  });

  it('offers nothing to pick when the read is already in every format', async () => {
    renderSheet(buildEngagement({ formats: [Format.print, Format.digital, Format.audio] }));

    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: /Print|Digital|Audio/ })).not.toBeInTheDocument();
  });
});
