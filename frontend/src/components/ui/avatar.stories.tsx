import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar, AvatarFallback } from './avatar';

const meta = {
  component: Avatar,
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

export const Default: Story = {};
export const Sm: Story = { args: { size: 'sm' } };
export const Lg: Story = { args: { size: 'lg' } };
