import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator';

const meta = {
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => (
    <div className="flex w-48 flex-col gap-4">
      <span>Above</span>
      <Separator {...args} />
      <span>Below</span>
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div className="flex h-16 items-center gap-4">
      <span>Left</span>
      <Separator {...args} />
      <span>Right</span>
    </div>
  ),
};
