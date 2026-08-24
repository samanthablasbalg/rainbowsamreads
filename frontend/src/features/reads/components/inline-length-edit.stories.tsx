import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, userEvent, within } from 'storybook/test';
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

export const Audio: Story = {
  args: { value: 600, isAudio: true },
};

export const Unset: Story = {
  args: { value: null },
};

export const Editing: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit length' }));
  },
};
