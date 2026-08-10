import { fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/msw-server';
import { render, screen } from '@/test/render';
import type { EntryView } from '../utils/entry-view';
import { EntryEditSheet } from './entry-edit-sheet';

const newest: EntryView = {
  id: 'log-1',
  dateLabel: 'Sun, Jun 15, 2025',
  rangeLabel: 'pp. 50–100',
  amountLabel: '+50 pp',
  isNewest: true,
  loggedOn: '2025-06-15',
  isAudio: false,
  start: 50,
  end: 100,
};

function renderSheet(entry: EntryView, onRequestDelete = () => {}) {
  return render(
    <EntryEditSheet
      engagementId="engagement-1"
      entry={entry}
      open
      onOpenChange={() => {}}
      onRequestDelete={onRequestDelete}
    />
  );
}

// A PATCH that records what the sheet actually sent, so the assertions are about the
// request rather than about the component's own state.
function capturePatch() {
  const sent: Record<string, unknown>[] = [];
  server.use(
    http.patch('*/api/engagements/*/progress-logs/*', async ({ request }) => {
      sent.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({});
    })
  );
  return sent;
}

describe('EntryEditSheet', () => {
  it('seeds the fields from the entry it was opened on', async () => {
    renderSheet(newest);

    expect(await screen.findByLabelText('Log date')).toHaveValue('2025-06-15');
    expect(screen.getByLabelText('Ended at page')).toHaveValue('100');
  });

  it('seeds an audio entry as a clock position', async () => {
    renderSheet({ ...newest, isAudio: true, start: 80, end: 125 });

    expect(await screen.findByLabelText('Ended at')).toHaveValue('02:05');
  });

  it('sends only the date when only the date changed', async () => {
    const sent = capturePatch();
    renderSheet(newest);

    // fireEvent.change, not userEvent.type: a native date input takes segmented
    // keystrokes, so typing the ISO string into it doesn't land.
    fireEvent.change(await screen.findByLabelText('Log date'), {
      target: { value: '2025-06-10' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ logged_on: '2025-06-10' });
  });

  it('sends the end page when the position changed', async () => {
    const sent = capturePatch();
    renderSheet(newest);

    await userEvent.clear(await screen.findByLabelText('Ended at page'));
    await userEvent.type(screen.getByLabelText('Ended at page'), '150');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ page_end: 150 });
  });

  it('sends a minute position for an audio entry', async () => {
    const sent = capturePatch();
    renderSheet({ ...newest, isAudio: true, start: 80, end: 125 });

    await userEvent.clear(await screen.findByLabelText('Ended at'));
    await userEvent.type(screen.getByLabelText('Ended at'), '02:30');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toEqual({ minute_end: 150 });
  });

  it('keeps Save disabled until something actually changes', async () => {
    renderSheet(newest);

    expect(await screen.findByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('rejects a position at or below the entry’s own start', async () => {
    renderSheet(newest);

    await userEvent.clear(await screen.findByLabelText('Ended at page'));
    await userEvent.type(screen.getByLabelText('Ended at page'), '40');
    await userEvent.tab();

    expect(await screen.findByText('Must be past page 50')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  // The rule the backend enforces: only the newest entry of a read can have its position
  // changed or be deleted. An older one still edits its date.
  it('offers neither a position field nor delete on an older entry', async () => {
    renderSheet({ ...newest, isNewest: false });

    expect(await screen.findByLabelText('Log date')).toBeVisible();
    expect(screen.queryByLabelText('Ended at page')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete entry from Sun, Jun 15, 2025' })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Only the most recent session's pages can be changed.")).toBeVisible();
  });

  it('asks its host to handle delete rather than deleting from inside the sheet', async () => {
    const onRequestDelete = vi.fn();
    renderSheet(newest, onRequestDelete);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete entry from Sun, Jun 15, 2025' })
    );

    expect(onRequestDelete).toHaveBeenCalledOnce();
  });

  it('surfaces the server’s reason when a save is refused', async () => {
    server.use(
      http.patch('*/api/engagements/*/progress-logs/*', () =>
        HttpResponse.json(
          { detail: "That date would be before the engagement's start date." },
          { status: 409 }
        )
      )
    );
    renderSheet(newest);

    fireEvent.change(await screen.findByLabelText('Log date'), {
      target: { value: '2024-01-01' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "That date would be before the engagement's start date."
    );
  });
});
