import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookReadings } from './book-readings';

const meta = {
  component: BookReadings,
  args: { tracked: true },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookReadings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tracked: Story = {};

export const Untracked: Story = {
  args: { tracked: false },
};
