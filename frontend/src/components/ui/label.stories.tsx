import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';
import { Label } from './label';

const meta = {
  component: Label,
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="story-label" {...args} />
      <Input id="story-label" />
    </div>
  ),
  args: {
    children: 'Name',
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
