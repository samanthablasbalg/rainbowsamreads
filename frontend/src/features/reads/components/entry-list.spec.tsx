import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { getEngagementsListProgressLogsMockHandler } from '@/api/generated/engagements/engagements.msw';
import { server } from '@/test/msw-server';
import { render, screen, within } from '@/test/render';
import { buildPageLog } from '@/test/data-generators';
import { EntryList } from './entry-list';

async function openEditorFor(dateLabel: string) {
  await userEvent.click(
    await screen.findByRole('button', { name: `Edit entry from ${dateLabel}` })
  );
}

describe('EntryList', () => {
  it('renders the read’s entries newest first', async () => {
    server.use(
      getEngagementsListProgressLogsMockHandler([
        buildPageLog({ id: 'older', logged_on: '2025-06-14', page_start: 0, page_end: 50 }),
        buildPageLog({ id: 'newer', logged_on: '2025-06-15', page_start: 50, page_end: 100 }),
      ])
    );

    render(<EntryList engagementId="engagement-Piranesi" />);

    const rows = within(await screen.findByRole('list', { name: 'History' })).getAllByRole(
      'listitem'
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Sun, Jun 15, 2025');
    expect(rows[1]).toHaveTextContent('Sat, Jun 14, 2025');
  });

  it('shows each entry’s range and the amount it covered', async () => {
    server.use(
      getEngagementsListProgressLogsMockHandler([buildPageLog({ page_start: 50, page_end: 100 })])
    );

    render(<EntryList engagementId="engagement-Piranesi" />);

    const row = within(await screen.findByRole('list', { name: 'History' })).getByRole('listitem');
    expect(row).toHaveTextContent('pp. 50–100');
    expect(row).toHaveTextContent('+50 pp');
  });

  it('shows an empty state for a read with nothing logged yet', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([]));

    render(<EntryList engagementId="engagement-Piranesi" />);

    expect(await screen.findByText('Nothing logged yet')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'History' })).not.toBeInTheDocument();
  });

  it('offers logging from the empty state when the read can still be logged against', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([]));
    const onLogProgress = vi.fn();

    render(<EntryList engagementId="engagement-Piranesi" onLogProgress={onLogProgress} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Log progress' }));

    expect(onLogProgress).toHaveBeenCalledOnce();
  });

  // A finished or abandoned read gets the empty state with nothing to do about it.
  it('leaves the empty state actionless without a logging handler', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([]));

    render(<EntryList engagementId="engagement-Piranesi" />);

    expect(await screen.findByText('Nothing logged yet')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Log progress' })).not.toBeInTheDocument();
  });

  it('shows a pending state while the entries load', () => {
    server.use(getEngagementsListProgressLogsMockHandler([]));

    render(<EntryList engagementId="engagement-Piranesi" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('opens the editor for the entry whose control was used', async () => {
    server.use(
      getEngagementsListProgressLogsMockHandler([
        buildPageLog({ id: 'older', logged_on: '2025-06-14' }),
        buildPageLog({ id: 'newer', logged_on: '2025-06-15' }),
      ])
    );

    render(<EntryList engagementId="engagement-Piranesi" />);
    await openEditorFor('Sat, Jun 14, 2025');

    expect(await screen.findByRole('dialog')).toHaveTextContent('Sat, Jun 14, 2025');
  });

  // The confirmation is a sibling of the editor, not a child: Delete closes the sheet and
  // opens the confirmation, so there is never a dialog inside a dialog.
  it('closes the editor before confirming a delete', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([buildPageLog({ id: 'only' })]));

    render(<EntryList engagementId="engagement-Piranesi" />);
    await openEditorFor('Sun, Jun 15, 2025');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete entry from Sun, Jun 15, 2025' })
    );

    const confirmation = await screen.findByRole('dialog');
    expect(confirmation).toHaveTextContent('Delete this entry?');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('deletes the entry once the confirmation is accepted', async () => {
    const deleted: string[] = [];
    server.use(
      getEngagementsListProgressLogsMockHandler([buildPageLog({ id: 'only' })]),
      http.delete('*/api/engagements/*/progress-logs/:logId', ({ params }) => {
        deleted.push(String(params.logId));
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(<EntryList engagementId="engagement-Piranesi" />);
    await openEditorFor('Sun, Jun 15, 2025');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete entry from Sun, Jun 15, 2025' })
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await vi.waitFor(() => expect(deleted).toEqual(['only']));
  });

  it('surfaces the server’s reason when a delete is refused', async () => {
    server.use(
      getEngagementsListProgressLogsMockHandler([buildPageLog({ id: 'only' })]),
      http.delete('*/api/engagements/*/progress-logs/*', () =>
        HttpResponse.json(
          { detail: 'Only the most recent progress log can be deleted.' },
          { status: 409 }
        )
      )
    );

    render(<EntryList engagementId="engagement-Piranesi" />);
    await openEditorFor('Sun, Jun 15, 2025');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete entry from Sun, Jun 15, 2025' })
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the most recent progress log can be deleted.'
    );
  });

  it('shows an error state when the entries fail to load', async () => {
    server.use(
      http.get('*/api/engagements/*/progress-logs', () => new HttpResponse(null, { status: 500 }))
    );

    render(<EntryList engagementId="engagement-Piranesi" />);

    expect(await screen.findByRole('alert')).toBeVisible();
  });
});
