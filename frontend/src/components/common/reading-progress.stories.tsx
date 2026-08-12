import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReadingProgress } from './reading-progress';

const meta = {
  component: ReadingProgress,
  args: {
    title: 'Piranesi',
    pct: 52,
  },
} satisfies Meta<typeof ReadingProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mid: Story = {};
export const NotStarted: Story = { args: { pct: null } };
export const Complete: Story = { args: { pct: 100 } };
