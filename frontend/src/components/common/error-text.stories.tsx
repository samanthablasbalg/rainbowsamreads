import type { Meta, StoryObj } from '@storybook/react-vite';
import { ErrorText } from './error-text';

const meta = {
  component: ErrorText,
  args: { children: "Couldn't delete this book. Please try again." },
} satisfies Meta<typeof ErrorText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
