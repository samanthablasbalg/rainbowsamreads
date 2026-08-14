import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { BookRow } from './book-row';

const meta = {
  component: BookRow,
  args: {
    title: 'Piranesi',
    author: 'Susanna Clarke',
    cover: null,
    slots: [
      <Button size="sm" className="col-span-2 @xl:col-span-1">
        Mark as reading
      </Button>,
    ],
    menu: <DropdownMenuItem>Delete</DropdownMenuItem>,
  },
  render: (args) => (
    <ul>
      <BookRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof BookRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneSlot: Story = {};

export const TwoSlots: Story = {
  args: {
    slots: [
      <div className="col-span-2 @xl:col-span-1 @xl:w-40 text-sm text-muted-foreground">
        A slot
      </div>,
      <Button size="sm" className="col-span-2 @xl:col-span-1">
        Log progress
      </Button>,
    ],
  },
};

export const WithDetails: Story = {
  args: {
    details: <p className="text-sm text-muted-foreground">272 pages</p>,
  },
};

export const LongTitle: Story = {
  args: {
    title: 'The Rise and Fall of the Third Chimpanzee: Evolution and Human Life',
    author: 'Susanna Clarke, Neil Gaiman, Terry Pratchett',
  },
};
