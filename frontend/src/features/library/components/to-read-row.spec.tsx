import userEvent from '@testing-library/user-event';
import { getEngagementsDeleteEngagementMockHandler } from '@/api/generated/engagements/engagements.msw';
import { type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { buildEngagement } from '@/test/data-generators';
import { ToReadRow } from './to-read-row';

function renderInList(engagement: EngagementRead) {
  return render(
    <ul>
      <ToReadRow engagement={engagement} />
    </ul>
  );
}

async function openOverflowMenuAndChoose(user: ReturnType<typeof userEvent.setup>, item: string) {
  await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

describe('ToReadRow', () => {
  it('renders the title and author on a listitem named for the book', () => {
    renderInList(buildEngagement());

    expect(screen.getByRole('listitem', { name: 'Piranesi' })).toHaveTextContent('Susanna Clarke');
  });

  it.skip('shows the length of the book', () => {
    renderInList(buildEngagement());
    expect(screen.getByText('272 pages · 8h 32m')).toBeVisible();
  });

  it('offers delete from the overflow menu', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));
    await screen.findByRole('menu');

    expect(screen.getAllByRole('menuitem').map((item) => item.getAttribute('aria-label'))).toEqual([
      'Remove Piranesi from To Read',
    ]);
  });

  it('deletes the read, after confirming, when Delete is chosen', async () => {
    const user = userEvent.setup();
    server.use(getEngagementsDeleteEngagementMockHandler());
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Remove Piranesi from To Read');
    expect(
      await screen.findByRole('dialog', { name: 'Remove "Piranesi" from To Read?' })
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('leaves the read alone when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Remove Piranesi from To Read');
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the start-reading sheet from Mark as reading', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await user.click(screen.getByRole('button', { name: 'Mark Piranesi as reading' }));

    expect(await screen.findByRole('button', { name: 'Start reading Piranesi' })).toBeVisible();
  });
});
