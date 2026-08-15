import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookMetadata } from './book-metadata';

// The card lives in the 15rem rail, and its rows are built to wrap at that width rather
// than push a caption off the side -- so the story constrains itself to the same measure.
const meta = {
  component: BookMetadata,
  args: { tracked: true },
  decorators: [
    (Story) => (
      <div className="w-60">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookMetadata>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tracked: Story = {};

export const Untracked: Story = {
  args: { tracked: false },
};
