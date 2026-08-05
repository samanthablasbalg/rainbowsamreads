import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { Button } from './button';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './sheet';

// `side` lives on SheetContent, not on the Sheet root -- Sheet only supplies open
// state, SheetContent renders the sliding panel -- so the Playground control needs a
// custom render function to reach it, and Meta's args type is widened to match.
type PlaygroundArgs = ComponentProps<typeof Sheet> & {
  side: 'top' | 'right' | 'bottom' | 'left';
};

const meta = {
  tags: ['autodocs'],
  args: {
    defaultOpen: true,
    side: 'right',
  },
  argTypes: {
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
    },
  },
  render: ({ side, ...rootProps }) => (
    <Sheet {...rootProps}>
      <SheetTrigger render={<Button variant="outline">Open</Button>} />
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Sheet title</SheetTitle>
          <SheetDescription>A one-line description of what this sheet does.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
} satisfies Meta<PlaygroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Top: Story = { args: { side: 'top' } };
export const Right: Story = { args: { side: 'right' } };
export const Bottom: Story = { args: { side: 'bottom' } };
export const Left: Story = { args: { side: 'left' } };
