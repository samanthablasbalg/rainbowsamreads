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

export const ExistingText: Story = {
  args: { value: 'A *striking* quote.' },
  play: async () => {
    expect(await screen.findByText('striking')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  },
};

export const EditsExistingText: Story = {
  args: { value: 'A striking quote.' },
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Edit note' }));
    expect(await screen.findByLabelText('Note')).toHaveValue('A striking quote.');
  },
};

export const Disabled: Story = {
  args: { value: 'A striking quote.', disabled: true },
};
