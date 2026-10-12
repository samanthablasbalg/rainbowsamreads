import type { Meta, StoryObj } from '@storybook/react-vite';
import { Streak } from './streak';

const meta = {
  component: Streak,
  args: {
    data: {
      count: 5,
      logged_today: true,
    },
  },
} satisfies Meta<typeof Streak>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LitStreak: Story = {};

export const UnlitStreak: Story = {
  args: {
    data: {
      count: 3,
      logged_today: false,
    },
  },
};

export const BrokenStreak: Story = {
  args: {
    data: {
      count: 0,
      logged_today: false,
    },
  },
};
