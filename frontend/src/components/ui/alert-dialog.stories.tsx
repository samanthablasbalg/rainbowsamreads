import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Button } from './button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from './alert-dialog';

// Opened by `play` rather than `defaultOpen` -- see sheet.stories.tsx for why: a modal
// dialog portals a fixed, full-viewport backdrop and traps focus, so mounting more than
// one open at a time (as the docs page would with `defaultOpen`) stacks backdrops and
// makes the canvas unusable. Play functions don't run in docs, so docs gets a trigger
// button and the canvas still shows the dialog open.
const meta = {
  component: AlertDialog,
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    // screen, not `within(canvasElement)`: AlertDialogContent renders through a portal,
    // so it lands outside the story's own element. The role is `alertdialog`, not
    // `dialog` -- that's the ARIA distinction this component exists to get right.
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  },
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger render={<Button variant="outline">Open</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this read?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the read and its progress logs. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  render: (args) => (
    <AlertDialog {...args}>
      <AlertDialogTrigger render={<Button variant="outline">Open</Button>} />
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Mark as finished?</AlertDialogTitle>
          <AlertDialogDescription>You can change this later.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Finish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

// The one behaviour that justifies this component over plain Dialog: a backdrop click
// does nothing, rather than silently answering "no" to a destructive prompt.
export const BackdropDoesNotDismiss: Story = {
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    const alertDialog = await screen.findByRole('alertdialog');

    await userEvent.click(document.body);

    expect(screen.getByRole('alertdialog')).toBe(alertDialog);
  },
};
