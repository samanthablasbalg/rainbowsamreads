import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { InlineLengthEdit } from './inline-length-edit';

const meta = {
  component: InlineLengthEdit,
  args: {
    value: 272,
    isAudio: false,
    onSave: fn(),
  },
  decorators: [
    (Story) => (
      <p className="text-sm text-muted-foreground">
        Length <Story />
      </p>
    ),
  ],
} satisfies Meta<typeof InlineLengthEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pages: Story = {};

// An audio read edits in HH:MM, the same input the log sheet takes a position in.
export const Audio: Story = {
  args: { value: 600, isAudio: true },
};

// A read bound to an edition nobody has given a length yet.
export const Unset: Story = {
  args: { value: null },
};
