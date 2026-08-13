import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { BookRow } from './book-row';

// The row renders an <li>, so every story supplies the <ul> it belongs in rather than
// leaving a list item loose in the document -- which axe reports, correctly.
//
// `cover` is null throughout: a real src would be a live network request from the headless
// browser these run in, and the cover is CoverImage's behaviour rather than this row's.
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

// The two shapes the row supports. Both are worth looking at at a few widths: the @xl
// container query is what decides stacked vs one line, and the slot count is what decides
// how many tracks that line has.
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

// Details are the lines under the author -- formats, dates, lengths, a failed action.
export const WithDetails: Story = {
  args: {
    details: <p className="text-sm text-muted-foreground">272 pages</p>,
  },
};

// A title long enough to prove the 1fr track holds it rather than widening the row.
export const LongTitle: Story = {
  args: {
    title: 'The Rise and Fall of the Third Chimpanzee: Evolution and Human Life',
    author: 'Susanna Clarke, Neil Gaiman, Terry Pratchett',
  },
};
