import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarFallback } from './avatar';

// Fallback-only, not AvatarImage: a real <img src> would be a live network request in
// the remote headless browser these stories run in, and the app itself renders the
// fallback whenever a user has no Google picture (see account-menu.tsx) -- so this is
// real composed content, not a stand-in for content we're skipping.
//
// children is supplied by `render`, not `args`: an arg has to be a plain, serializable
// value for the controls/docs machinery to source-print it, and a JSX element isn't.
const meta = {
  component: Avatar,
  tags: ['autodocs'],
  args: {
    size: 'default',
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg'],
    },
  },
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>R</AvatarFallback>
    </Avatar>
  ),
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { size: 'default' } };
export const Sm: Story = { args: { size: 'sm' } };
export const Lg: Story = { args: { size: 'lg' } };
