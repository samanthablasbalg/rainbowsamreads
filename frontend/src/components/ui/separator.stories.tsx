import type { Meta, StoryObj } from '@storybook/react-vite';
import { Separator } from './separator';

const meta = {
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

// A horizontal separator divides stacked content, so the demo container stacks too --
// a row would put the full-width line at an angle to what it's meant to divide.
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
