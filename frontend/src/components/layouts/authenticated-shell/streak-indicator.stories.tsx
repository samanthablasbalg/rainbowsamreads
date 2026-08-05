import type { Meta, StoryObj } from '@storybook/react-vite';
import { StreakIndicator } from './streak-indicator';

const meta = {
  component: StreakIndicator,
} satisfies Meta<typeof StreakIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Zero: Story = { args: { days: 0 } };
export const One: Story = { args: { days: 1 } };
export const Many: Story = { args: { days: 42 } };
