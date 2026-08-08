import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, FieldLabel } from './field';
import { Textarea } from './textarea';

// Same shape as input.stories.tsx: a bare Textarea has no accessible name of its own, so
// every story pairs it with a FieldLabel -- both so axe has something to check and so the
// stories look like how the app actually uses it.
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

// field-sizing-content means the box grows with its value rather than scrolling, so the
// filled state is a distinct rendering rather than the default one with text in it.
export const Filled: Story = {
  args: {
    defaultValue:
      'A house of infinite halls and tides. I read the last fifty pages twice and would happily start it again tomorrow.',
  },
};

export const Disabled: Story = { args: { defaultValue: 'Locked', disabled: true } };

export const Invalid: Story = { args: { defaultValue: 'Too long', 'aria-invalid': true } };
