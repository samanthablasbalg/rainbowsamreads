import { delay, http } from 'msw';
import { getEngagementsListEngagementsMockHandler } from '@/api/generated/engagements/engagements.msw';
import { getInsightsGetStreakQueryKey } from '@/api/generated/insights/insights';
import { getInsightsGetStreakMockHandler } from '@/api/generated/insights/insights.msw';
import { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { server } from '@/test/msw-server';
import { render, screen, waitFor } from '@/test/render';
import { buildEngagement } from '@/test/data-generators';
import { localIsoDate } from '@/utils/local-date';
import { CurrentlyReadingList } from './currently-reading-list';

function reading(title: string) {
  return buildEngagement({
    title,
    status: ReadingStatus.reading,
    started_on: '2025-01-01',
    finished_on: null,
    resume_from_page: 0,
    completion_pct: null,
  });
}

describe('CurrentlyReadingList', () => {
  it('renders a card per engagement in the order the API returns them', async () => {
    server.use(getEngagementsListEngagementsMockHandler([reading('Dune'), reading('Piranesi')]));

    render(<CurrentlyReadingList />);

    expect(await screen.findByRole('listitem', { name: 'Dune' })).toBeVisible();
    const cards = screen.getAllByRole('listitem');
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual(['Dune', 'Piranesi']);
  });

  it('shows an empty state when there are no engagements', async () => {
    server.use(
      getEngagementsListEngagementsMockHandler([]),
      getInsightsGetStreakMockHandler({ count: 0, logged_today: false })
    );

    render(<CurrentlyReadingList />);

    expect(await screen.findByText('Nothing in progress')).toBeVisible();
    expect(await screen.findByRole('img', { name: '0 day streak' })).toBeVisible();
    expect(screen.queryByText('·')).not.toBeInTheDocument();
  });

  it('shows the separator when the book count and streak are visible', async () => {
    server.use(
      getEngagementsListEngagementsMockHandler([reading('Dune')]),
      getInsightsGetStreakMockHandler({ count: 2, logged_today: true })
    );

    render(<CurrentlyReadingList />);

    expect(await screen.findByRole('img', { name: '2 day streak' })).toBeVisible();
    expect(screen.getByText('·')).toBeVisible();
  });

  it('hides the separator while the streak loads', async () => {
    server.use(
      getEngagementsListEngagementsMockHandler([reading('Dune')]),
      http.get('*/api/insights/streak', () => delay('infinite'))
    );

    render(<CurrentlyReadingList />);

    expect(await screen.findByRole('listitem', { name: 'Dune' })).toBeVisible();
    expect(screen.queryByText('·')).not.toBeInTheDocument();
  });

  it('hides the separator when the streak fails', async () => {
    server.use(
      getEngagementsListEngagementsMockHandler([reading('Dune')]),
      http.get('*/api/insights/streak', () => new Response(null, { status: 500 }))
    );

    const { queryClient } = render(<CurrentlyReadingList />);
    const queryKey = getInsightsGetStreakQueryKey({ date: localIsoDate() });

    await waitFor(() => {
      expect(queryClient.getQueryState(queryKey)?.status).toBe('error');
    });
    expect(screen.queryByText('·')).not.toBeInTheDocument();
  });
});
