import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, FieldDescription, FieldError, FieldLabel } from './field';
import { Input } from './input';

const meta = {
  component: Field,
  render: (args) => (
    <Field {...args}>
      <FieldLabel htmlFor="story-field">Name</FieldLabel>
      <Input id="story-field" />
      <FieldDescription>Shown on your profile.</FieldDescription>
    </Field>
  ),
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Invalid: Story = {
  render: (args) => (
    <Field {...args} data-invalid>
      <FieldLabel htmlFor="story-field-invalid">Name</FieldLabel>
      <Input id="story-field-invalid" aria-invalid />
      <FieldError>Name is required.</FieldError>
    </Field>
  ),
};

export const Horizontal: Story = { args: { orientation: 'horizontal' } };
