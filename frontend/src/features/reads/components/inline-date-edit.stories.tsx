import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { InlineDateEdit } from './inline-date-edit';

const meta = {
  component: InlineDateEdit,
  args: {
    value: '2025-06-15',
    label: 'start date',
    onSave: fn(),
  },
  decorators: [
    (Story) => (
      <p className="text-sm text-muted-foreground">
        Started <Story />
      </p>
    ),
  ],
} satisfies Meta<typeof InlineDateEdit>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Set: Story = {};

export const Unset: Story = {
  args: { value: null },
};

// An abandoned date renders here too, but PATCH /dates cannot write it.
export const Disabled: Story = {
  args: { disabled: true },
};
