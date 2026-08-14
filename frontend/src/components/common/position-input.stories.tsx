import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PositionInput } from './position-input';

function ControlledPositionInput({
  value: initial,
  ...props
}: ComponentProps<typeof PositionInput>) {
  const [value, setValue] = useState(initial);
  return <PositionInput {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  component: PositionInput,
  args: {
    isAudio: false,
    value: '',
    onValueChange: fn(),
    'aria-label': 'Position',
  },
  render: (args) => <ControlledPositionInput {...args} />,
  decorators: [
    (Story) => (
      <div className="w-32">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PositionInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Print: Story = {};

export const PrintFilled: Story = {
  args: { value: '142' },
};

export const Audio: Story = {
  args: { isAudio: true, value: '02:05' },
};

export const AudioMasksTyping: Story = {
  args: { isAudio: true },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole('textbox', { name: 'Position' });

    await userEvent.type(field, '123');
    await expect(field).toHaveValue('01:23');
  },
};

export const PrintKeepsWhatIsTyped: Story = {
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole('textbox', { name: 'Position' });

    await userEvent.type(field, '12x');
    await expect(field).toHaveValue('12x');
  },
};

export const Invalid: Story = {
  args: { value: '12x', 'aria-invalid': true },
};

export const Disabled: Story = {
  args: { value: '142', disabled: true },
};
