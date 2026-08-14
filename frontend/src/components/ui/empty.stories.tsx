import type { Meta, StoryObj } from '@storybook/react-vite';
import { HugeiconsIcon } from '@hugeicons/react';
import { Book02Icon } from '@hugeicons/core-free-icons';
import { Button } from './button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from './empty';

const meta = {
  component: Empty,
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Book02Icon} />
        </EmptyMedia>
        <EmptyTitle>No books yet</EmptyTitle>
        <EmptyDescription>Search for a book to add it to your shelves.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Add a book</Button>
      </EmptyContent>
    </Empty>
  ),
};

export const Illustration: Story = {
  render: (args) => (
    <Empty {...args}>
      <EmptyHeader>
        <EmptyMedia>
          <HugeiconsIcon icon={Book02Icon} size={64} className="text-muted-foreground" />
        </EmptyMedia>
        <EmptyTitle>Nothing here</EmptyTitle>
        <EmptyDescription>Whatever you were looking for hasn&apos;t landed yet.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};
