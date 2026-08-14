import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, FieldLabel } from './field';
import { Textarea } from './textarea';

const meta = {
  component: Textarea,
  render: (args) => (
    <Field>
      <FieldLabel htmlFor="story-textarea">Review</FieldLabel>
      <Textarea id="story-textarea" {...args} />
    </Field>
  ),
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: 'What did you think?' } };

export const Filled: Story = {
  args: {
    defaultValue:
      'A house of infinite halls and tides. I read the last fifty pages twice and would happily start it again tomorrow.',
  },
};

export const Disabled: Story = { args: { defaultValue: 'Locked', disabled: true } };

export const Invalid: Story = { args: { defaultValue: 'Too long', 'aria-invalid': true } };
