import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { withPointer } from '@/testing/pointer-decorator';
import { Button } from './button';
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from './responsive-dialog';

const meta = {
  component: ResponsiveDialog,
  render: () => (
    <ResponsiveDialog>
      <ResponsiveDialogTrigger render={<Button variant="outline">Open</Button>} />
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Responsive dialog title</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            The same tree renders as a centred dialog or a bottom drawer.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose render={<Button variant="outline">Cancel</Button>} />
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  ),
} satisfies Meta<typeof ResponsiveDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// Each story asserts the data-slot of the part that actually rendered, so a regression
// that quietly picks the wrong family fails here rather than only on a real phone.
export const FinePointer: Story = {
  decorators: [withPointer(false)],
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    const popup = await screen.findByRole('dialog');
    expect(popup).toHaveAttribute('data-slot', 'dialog-content');
  },
};

export const CoarsePointer: Story = {
  decorators: [withPointer(true)],
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    const popup = await screen.findByRole('dialog');
    expect(popup).toHaveAttribute('data-slot', 'drawer-popup');
  },
};
