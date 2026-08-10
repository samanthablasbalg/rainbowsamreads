import userEvent from '@testing-library/user-event';
import { getEngagementsDeleteEngagementMockHandler } from '@/api/generated/engagements/engagements.msw';
import { ReadingStatus, type EngagementRead } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { buildEngagement } from '@/testing/data-generators';
import { EngagementRow } from './engagement-row';

function buildDnf(overrides: Partial<EngagementRead> = {}): EngagementRead {
  return buildEngagement({
    status: ReadingStatus.dnf,
    finished_on: null,
    abandoned_on: '2025-03-12',
    completion_pct: 42,
    ...overrides,
  });
}

function renderInList(engagement: EngagementRead) {
  return render(
    <ul>
      <EngagementRow engagement={engagement} />
    </ul>
  );
}

async function openOverflowMenuAndChoose(user: ReturnType<typeof userEvent.setup>, item: string) {
  await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));
  await user.click(await screen.findByRole('menuitem', { name: item }));
}

describe('EngagementRow', () => {
  it('renders the title and author on a listitem named for the book', () => {
    renderInList(buildEngagement());

    expect(screen.getByRole('listitem', { name: 'Piranesi' })).toHaveTextContent('Susanna Clarke');
  });

  it('shows the finish date for a finished read', () => {
    renderInList(buildEngagement({ finished_on: '2025-03-12', abandoned_on: null }));

    expect(screen.getByText('Finished Mar 12, 2025')).toBeVisible();
  });

  it('shows the abandon date for a DNF read', () => {
    renderInList(buildDnf({ abandoned_on: '2025-03-12' }));

    expect(screen.getByText('Abandoned Mar 12, 2025')).toBeVisible();
  });

  it('shows no date line for a read with neither date set', () => {
    renderInList(buildEngagement({ finished_on: null, abandoned_on: null }));

    expect(screen.queryByText(/Finished|Abandoned/)).not.toBeInTheDocument();
  });

  // The dates are date-only strings, which `new Date` reads as UTC midnight -- formatting
  // them in local time lands on the previous day for anyone behind UTC. TZ is stubbed
  // because the test container runs at UTC, where both the fix and the bug look identical.
  it('keeps the calendar day the backend wrote when the reader is behind UTC', () => {
    vi.stubEnv('TZ', 'America/Los_Angeles');

    renderInList(buildEngagement({ finished_on: '2025-03-12' }));

    expect(screen.getByText('Finished Mar 12, 2025')).toBeVisible();

    vi.unstubAllEnvs();
  });

  it('shows how far a DNF read got', () => {
    renderInList(buildDnf({ completion_pct: 42 }));

    expect(screen.getByText('Stopped at 42%')).toBeVisible();
  });

  it('shows no stopping point for a finished read', () => {
    renderInList(buildEngagement({ completion_pct: 100 }));

    expect(screen.queryByText(/Stopped at/)).not.toBeInTheDocument();
  });

  it('shows no stopping point for a DNF read with no progress logged', () => {
    renderInList(buildDnf({ completion_pct: null }));

    expect(screen.queryByText(/Stopped at/)).not.toBeInTheDocument();
  });

  it('shows the rating for a read that has one', () => {
    renderInList(buildEngagement({ review: { rating: '4.50', body: null } }));

    expect(screen.getByRole('img', { name: 'Rated 4.5 out of 5' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Add a rating for Piranesi' })
    ).not.toBeInTheDocument();
  });

  it('offers to add a rating for a read that has none', () => {
    renderInList(buildEngagement({ review: null }));

    expect(screen.getByRole('button', { name: 'Add a rating for Piranesi' })).toBeVisible();
    expect(screen.queryByRole('img', { name: /Rated/ })).not.toBeInTheDocument();
  });

  it('treats a review with a body but no rating as unrated', () => {
    renderInList(buildEngagement({ review: { rating: null, body: 'Loved the halls.' } }));

    expect(screen.getByRole('button', { name: 'Add a rating for Piranesi' })).toBeVisible();
  });

  it('keeps the review body off the shelf', () => {
    renderInList(buildEngagement({ review: { rating: '4.00', body: 'Loved the halls.' } }));

    expect(screen.queryByText('Loved the halls.')).not.toBeInTheDocument();
  });

  it('opens the review sheet from the Add rating button', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await user.click(screen.getByRole('button', { name: 'Add a rating for Piranesi' }));

    expect(await screen.findByRole('dialog', { name: 'Piranesi' })).toBeVisible();
  });

  it('offers history, rate and review, and delete from the overflow menu, in that order', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));
    await screen.findByRole('menu');

    expect(screen.getAllByRole('menuitem').map((item) => item.getAttribute('aria-label'))).toEqual([
      'View history for Piranesi',
      'Rate and review Piranesi',
      'Delete Piranesi',
    ]);
  });

  // A finished or DNF read reaches its history the same way a current one does.
  it('links View history at the read’s page', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));

    expect(
      await screen.findByRole('menuitem', { name: 'View history for Piranesi' })
    ).toHaveAttribute('href', '/reads/engagement-Piranesi');
  });

  it('opens the review sheet from the overflow menu', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Rate and review Piranesi');

    expect(await screen.findByRole('dialog', { name: 'Piranesi' })).toBeVisible();
  });

  it('offers to edit rather than add when the read is already rated', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement({ review: { rating: '4.00', body: null } }));

    await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));

    expect(
      await screen.findByRole('menuitem', { name: 'Rate and review Piranesi' })
    ).toHaveTextContent('Edit rating & review');
  });

  it('offers to add when the read is unrated', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement({ review: null }));

    await user.click(screen.getByRole('button', { name: 'More actions for Piranesi' }));

    expect(
      await screen.findByRole('menuitem', { name: 'Rate and review Piranesi' })
    ).toHaveTextContent('Add rating & review');
  });

  it('deletes the read, after confirming, when Delete is chosen', async () => {
    const user = userEvent.setup();
    server.use(getEngagementsDeleteEngagementMockHandler());
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Delete Piranesi');
    expect(
      await screen.findByRole('dialog', { name: 'Delete this read of "Piranesi"?' })
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // No MSW handler registered for this one -- the suite's onUnhandledRequest: 'error'
  // means a mutation firing anyway would fail the test, not just an assertion missing.
  it('leaves the read alone when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderInList(buildEngagement());

    await openOverflowMenuAndChoose(user, 'Delete Piranesi');
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
