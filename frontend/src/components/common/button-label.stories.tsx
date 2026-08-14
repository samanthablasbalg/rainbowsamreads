import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import { ButtonLabel } from './button-label';

const meta = {
  component: ButtonLabel,
  args: {
    pending: false,
    pendingLabel: 'Saving…',
    children: 'Save',
  },
  render: (args) => (
    <Button disabled={args.pending}>
      <ButtonLabel {...args} />
    </Button>
  ),
} satisfies Meta<typeof ButtonLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};
export const Pending: Story = { args: { pending: true } };
