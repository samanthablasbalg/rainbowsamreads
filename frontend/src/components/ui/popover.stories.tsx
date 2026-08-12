import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from './popover';

const meta = {
  component: Popover,
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger render={<Button variant="outline">Open</Button>} />
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Anchored panel</PopoverTitle>
          <PopoverDescription>Positioned against the trigger.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

// The popup only exists in the DOM while open, so the closed story gives addon-a11y
// nothing but a button to check -- this is the one that actually audits the panel.
export const Open: Story = {
  args: { defaultOpen: true },
  render: Closed.render,
};
