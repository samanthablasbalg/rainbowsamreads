import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { HhmmInput } from './hhmm-input';

// The mask is only visible through a controlled parent: each keystroke re-renders the
// formatted value that the next keystroke is applied to. `args.value` seeds that state
// instead of driving it, so the field still moves when you type in the canvas -- which
// is the one thing these stories exist to show. The args' own onValueChange is replaced
// for the same reason.
function ControlledHhmmInput({ value: initial, ...props }: ComponentProps<typeof HhmmInput>) {
  const [value, setValue] = useState(initial);
  return <HhmmInput {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  component: HhmmInput,
  args: {
    value: '',
    onValueChange: fn(),
    'aria-label': 'Position',
  },
  render: (args) => <ControlledHhmmInput {...args} />,
  // It sits in a Field beside a From column in both sheets, never at page width.
  decorators: [
    (Story) => (
      <div className="w-32">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof HhmmInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = {
  args: { value: '02:05' },
};

// Focusing an empty field: the zeroed mask appears so the caret has an end to sit at,
// rather than parking at the left edge of a field whose first digit lands at the right.
export const FocusedEmpty: Story = {
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole<HTMLInputElement>('textbox', {
      name: 'Position',
    });

    await userEvent.click(field);

    await waitFor(() => expect(field).toHaveValue('00:00'));
    await expect(field.selectionStart).toBe(5);
  },
};

// Minutes past 59 are the one invalid state the mask can still reach, so the field has
// to render as invalid rather than the caller assuming it can't happen.
export const Invalid: Story = {
  args: { value: '00:75', 'aria-invalid': true },
};

export const Disabled: Story = {
  args: { value: '02:05', disabled: true },
};

// The mask itself: digits shift in from the right and the colon is never typed.
export const Typing: Story = {
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole('textbox', { name: 'Position' });

    await userEvent.type(field, '1');
    await expect(field).toHaveValue('00:01');

    await userEvent.type(field, '23');
    await expect(field).toHaveValue('01:23');

    await userEvent.type(field, '{Backspace}');
    await expect(field).toHaveValue('00:12');
  },
};
