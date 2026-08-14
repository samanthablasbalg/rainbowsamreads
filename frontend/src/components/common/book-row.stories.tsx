import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { BookRow } from './book-row';

const bookId = '3f2a1c4e-9b7d-4e15-8a63-0d2f5c8b71ae';

const meta = {
  component: BookRow,
  args: {
    title: 'Piranesi',
    to: `/books/${bookId}`,
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

export const TitleHovered: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.hover(canvas.getByRole('link', { name: 'Piranesi' }));
  },
};

export const LongTitleHovered: Story = {
  args: LongTitle.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.hover(canvas.getByRole('link', { name: /Third Chimpanzee/ }));
  },
};
