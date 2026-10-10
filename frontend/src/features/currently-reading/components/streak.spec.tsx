import { render, screen, waitFor } from '@/test/render';
import { Streak } from './streak';
import { server } from '@/test/msw-server';
import { getInsightsGetStreakMockHandler } from '@/api/generated/insights/insights.msw';
import { delay, http } from 'msw';
import { localIsoDate } from '@/utils/local-date';
import { getInsightsGetStreakQueryKey } from '@/api/generated/insights/insights';

describe('Streak', () => {
  it('renders the correct streak count', async () => {
    server.use(
      getInsightsGetStreakMockHandler({
        count: 2,
        logged_today: true,
      })
    );

    render(<Streak />);

    expect(await screen.findByRole('img', { name: '2 day streak' })).toBeVisible();
  });

  it('renders a 0 streak when the streak has been broken', async () => {
    server.use(
      getInsightsGetStreakMockHandler({
        count: 0,
        logged_today: false,
      })
    );

    render(<Streak />);

    expect(await screen.findByRole('img', { name: '0 day streak' })).toBeVisible();
  });

  it('renders nothing when the streak is loading', () => {
    server.use(http.get('*/api/insights/streak', () => delay('infinite')));

    render(<Streak />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders nothing when there is an error', async () => {
    server.use(http.get('*/api/insights/streak', () => new Response(null, { status: 500 })));

    const { queryClient } = render(<Streak />);

    const queryKey = getInsightsGetStreakQueryKey({
      date: localIsoDate(),
    });

    await waitFor(() => {
      expect(queryClient.getQueryState(queryKey)?.status).toBe('error');
    });

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
