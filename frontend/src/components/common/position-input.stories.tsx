import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PositionInput } from './position-input';

// Controlled by the story for the same reason hhmm-input.stories.tsx is: the audio branch
// re-formats the value on every keystroke, so it only moves if the parent feeds the result
// back in. `args.value` seeds that state rather than driving it.
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
  // It sits in a Field beside a From column in both sheets, never at page width.
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

// The print branch: a plain numeric box, placeholder showing while empty.
export const Print: Story = {};

export const PrintFilled: Story = {
  args: { value: '142' },
};

// The audio branch is HhmmInput, mask and all -- the swap is the whole point of the
// component, so both branches get a story rather than only the default one.
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

// Print takes what is typed as-is, which is what makes an unparseable value reach the
// sheet's error rather than being silently dropped the way type="number" would.
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
