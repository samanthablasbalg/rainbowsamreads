import type { Meta, StoryObj } from '@storybook/react-vite';
import { HistoryIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { EmptyState } from './empty-state';

const meta = {
  component: EmptyState,
  args: {
    title: 'No books yet',
    description: "Books you add show up here, whether or not you've read them.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

// The shelves, which take the default icon and no action.
export const Default: Story = {};

// A screen listing something other than books passes its own icon.
export const OwnIcon: Story = {
  args: {
    icon: HistoryIcon,
    title: 'Nothing logged yet',
    description: 'Sessions you log against this read show up here.',
  },
};

export const WithAction: Story = {
  args: {
    icon: HistoryIcon,
    title: 'Nothing logged yet',
    description: 'Sessions you log against this read show up here.',
    action: <Button>Log progress</Button>,
  },
};
