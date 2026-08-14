import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { HhmmInput } from './hhmm-input';

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

export const Invalid: Story = {
  args: { value: '00:75', 'aria-invalid': true },
};

export const Disabled: Story = {
  args: { value: '02:05', disabled: true },
};

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
