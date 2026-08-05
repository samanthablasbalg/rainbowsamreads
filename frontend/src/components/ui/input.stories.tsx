import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, FieldLabel } from './field';
import { Input } from './input';

// A bare Input has no accessible name of its own -- every story pairs it with a
// FieldLabel so axe has something to check, and so each story looks like how this
// app actually uses it.
const meta = {
  component: Input,
  render: (args) => (
    <Field>
      <FieldLabel htmlFor="story-input">Name</FieldLabel>
      <Input id="story-input" {...args} />
    </Field>
  ),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { type: 'text' } };

export const Number: Story = {
  render: (args) => (
    <Field>
      <FieldLabel htmlFor="story-input-number">Page</FieldLabel>
      <Input id="story-input-number" {...args} />
    </Field>
  ),
  args: { type: 'number' },
};

export const Date: Story = {
  render: (args) => (
    <Field>
      <FieldLabel htmlFor="story-input-date">Date</FieldLabel>
      <Input id="story-input-date" {...args} />
    </Field>
  ),
  args: { type: 'date' },
};

export const Disabled: Story = { args: { type: 'text', disabled: true } };

export const Invalid: Story = { args: { type: 'text', 'aria-invalid': true } };
