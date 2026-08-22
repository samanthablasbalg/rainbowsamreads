import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, useState } from 'react';
import { expect, fn, screen, userEvent, within } from 'storybook/test';
import { NoteField } from './note-field';

function ControlledNoteField({ value: initial, ...props }: ComponentProps<typeof NoteField>) {
  const [value, setValue] = useState(initial);
  return <NoteField {...props} value={value} onValueChange={setValue} />;
}

const meta = {
  component: NoteField,
  args: {
    id: 'note',
    value: '',
    onValueChange: fn(),
  },
  render: (args) => <ControlledNoteField {...args} />,
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NoteField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const RevealsAndFocusesOnClick: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '+ Add a note' }));

    const textarea = await canvas.findByLabelText('Note');
    expect(textarea).toHaveFocus();
  },
};

export const OpenWithExistingText: Story = {
  args: { value: 'A striking quote.', defaultOpen: true },
  play: async () => {
    expect(await screen.findByLabelText('Note')).toHaveValue('A striking quote.');
    expect(screen.queryByRole('button', { name: '+ Add a note' })).not.toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: { value: 'A striking quote.', defaultOpen: true, disabled: true },
};
