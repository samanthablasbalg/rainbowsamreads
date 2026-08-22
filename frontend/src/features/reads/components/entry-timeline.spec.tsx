import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { getEngagementsListProgressLogsMockHandler } from '@/api/generated/engagements/engagements.msw';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, within } from '@/test/render';
import { buildEngagement, buildPageLog } from '@/test/data-generators';
import { EntryTimeline } from './entry-timeline';

const engagement = buildEngagement({ length_pages: 200 });

function renderTimeline(props: Partial<Parameters<typeof EntryTimeline>[0]> = {}) {
  return render(<EntryTimeline engagement={engagement} {...props} />);
}

async function openEditorFor(dateLabel: string) {
  await userEvent.click(
    await screen.findByRole('button', { name: `Edit entry from ${dateLabel}` })
  );
}

describe('EntryTimeline', () => {
  it('renders the read’s entries newest first', async () => {
    server.use(
      getEngagementsListProgressLogsMockHandler([
        buildPageLog({ id: 'older', logged_on: '2025-06-14', page_start: 0, page_end: 50 }),
        buildPageLog({ id: 'newer', logged_on: '2025-06-15', page_start: 50, page_end: 100 }),
      ])
    );

    renderTimeline();

    const edits = await screen.findAllByRole('button', { name: /^Edit entry from/ });
    expect(edits.map((edit) => edit.getAttribute('aria-label'))).toEqual([
      'Edit entry from Sun, Jun 15, 2025',
      'Edit entry from Sat, Jun 14, 2025',
    ]);
  });

  it('shows each entry as the span it covered and the amount it added', async () => {
    server.use(
      getEngagementsListProgressLogsMockHandler([buildPageLog({ page_start: 50, page_end: 100 })])
    );

    renderTimeline();

    const entry = within(await screen.findByRole('list', { name: 'Jun 15' })).getByRole('listitem');
    expect(entry).toHaveTextContent('p. 50');
    expect(entry).toHaveTextContent('p. 100');
    expect(entry).toHaveTextContent('+50 pp');
  });

  it('gathers two sessions from one day under a single date heading', async () => {
    server.use(
      getEngagementsListProgressLogsMockHandler([
        buildPageLog({ id: 'first', logged_on: '2025-06-15', page_start: 0, page_end: 40 }),
        buildPageLog({ id: 'second', logged_on: '2025-06-15', page_start: 40, page_end: 90 }),
      ])
    );

    renderTimeline();

    const day = await screen.findByRole('list', { name: 'Jun 15' });
    expect(within(day).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByText('Jun 15')).toHaveLength(1);
  });

  it('shows a note on the entry that carries it', async () => {
    server.use(
      getEngagementsListProgressLogsMockHandler([
        buildPageLog({ note: '> The Beauty of the House is immeasurable.' }),
      ])
    );

    renderTimeline();

    expect(await screen.findByText('The Beauty of the House is immeasurable.')).toBeVisible();
  });

  it('bookends the timeline with the dates the read started and finished', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([buildPageLog()]));

    renderTimeline();

    expect(await screen.findByText(/Finished reading/)).toHaveTextContent('Mar 12, 2025');
    expect(screen.getByText(/Started reading/)).toHaveTextContent('Jan 1, 2025');
  });

  it('names the top marker for a read that was abandoned rather than finished', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([buildPageLog()]));

    renderTimeline({
      engagement: buildEngagement({
        status: ReadingStatus.dnf,
        finished_on: null,
        abandoned_on: '2025-03-12',
      }),
    });

    expect(await screen.findByText(/Abandoned reading/)).toHaveTextContent('Mar 12, 2025');
  });

  it('leaves the timeline open at the top while the read is still going', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([buildPageLog()]));

    renderTimeline({
      engagement: buildEngagement({ status: ReadingStatus.reading, finished_on: null }),
    });

    expect(await screen.findByText(/Started reading/)).toBeVisible();
    expect(screen.queryByText(/Finished reading/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Abandoned reading/)).not.toBeInTheDocument();
  });

  it('shows an empty state for a read with nothing logged yet', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([]));

    renderTimeline();

    expect(await screen.findByText('Nothing logged yet')).toBeVisible();
    expect(screen.queryByRole('list', { name: 'History' })).not.toBeInTheDocument();
  });

  it('offers logging from the empty state when the read can still be logged against', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([]));
    const onLogProgress = vi.fn();

    renderTimeline({ onLogProgress });

    await userEvent.click(await screen.findByRole('button', { name: 'Log progress' }));

    expect(onLogProgress).toHaveBeenCalledOnce();
  });

  it('leaves the empty state actionless without a logging handler', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([]));

    renderTimeline();

    expect(await screen.findByText('Nothing logged yet')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Log progress' })).not.toBeInTheDocument();
  });

  it('shows a pending state while the entries load', () => {
    server.use(getEngagementsListProgressLogsMockHandler([]));

    renderTimeline();

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });

  it('opens the editor for the entry whose control was used', async () => {
    server.use(
      getEngagementsListProgressLogsMockHandler([
        buildPageLog({ id: 'older', logged_on: '2025-06-14' }),
        buildPageLog({ id: 'newer', logged_on: '2025-06-15' }),
      ])
    );

    renderTimeline();
    await openEditorFor('Sat, Jun 14, 2025');

    expect(await screen.findByRole('dialog')).toHaveTextContent('Sat, Jun 14, 2025');
  });

  it('closes the editor before confirming a delete', async () => {
    server.use(getEngagementsListProgressLogsMockHandler([buildPageLog({ id: 'only' })]));

    renderTimeline();
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

    renderTimeline();
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

    renderTimeline();
    await openEditorFor('Sun, Jun 15, 2025');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete entry from Sun, Jun 15, 2025' })
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only the most recent progress log can be deleted.'
    );
  });
});
