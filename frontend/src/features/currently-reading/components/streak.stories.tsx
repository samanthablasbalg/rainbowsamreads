import type { Meta, StoryObj } from '@storybook/react-vite';
import { Streak } from './streak';

import { getInsightsGetStreakMockHandler } from '@/api/generated/insights/insights.msw';

const meta = {
  component: Streak,
  async beforeEach({ msw }) {
    msw.use(
      getInsightsGetStreakMockHandler({
        count: 5,
        logged_today: true,
      })
    );
  },
} satisfies Meta<typeof Streak>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LitStreak: Story = {};

export const UnlitStreak: Story = {
  async beforeEach({ msw }) {
    msw.use(
      getInsightsGetStreakMockHandler({
        count: 3,
        logged_today: false,
      })
    );
  },
};

export const BrokenStreak: Story = {
  async beforeEach({ msw }) {
    msw.use(
      getInsightsGetStreakMockHandler({
        count: 0,
        logged_today: false,
      })
    );
  },
};
