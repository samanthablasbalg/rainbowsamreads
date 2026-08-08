import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Button } from './button';
import {
  AlertSheet,
  AlertSheetTrigger,
  AlertSheetContent,
  AlertSheetHeader,
  AlertSheetTitle,
  AlertSheetDescription,
  AlertSheetFooter,
  AlertSheetCancel,
  AlertSheetAction,
} from './alert-sheet';

// `side` lives on AlertSheetContent, not on the AlertSheet root -- see sheet.stories.tsx
// for the same split on plain Sheet.
type PlaygroundArgs = ComponentProps<typeof AlertSheet> & {
  side: 'top' | 'right' | 'bottom' | 'left';
};

// Opened by `play` rather than `defaultOpen` -- see sheet.stories.tsx: mounting more
// than one open modal at a time, as the docs page would with `defaultOpen`, stacks
// backdrops and makes the canvas unusable.
const meta = {
  component: AlertSheet,
  args: {
    side: 'bottom',
  },
  argTypes: {
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
    },
  },
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    // screen, not `within(canvasElement)`: AlertSheetContent renders through a portal.
    // The role is `alertdialog`, not `dialog` -- same distinction as alert-dialog.tsx.
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  },
  render: ({ side, ...rootProps }) => (
    <AlertSheet {...rootProps}>
      <AlertSheetTrigger render={<Button variant="outline">Open</Button>} />
      <AlertSheetContent side={side}>
        <AlertSheetHeader>
          <AlertSheetTitle>Delete this read?</AlertSheetTitle>
          <AlertSheetDescription>
            This removes the read and its progress logs. This can&apos;t be undone.
          </AlertSheetDescription>
        </AlertSheetHeader>
        <AlertSheetFooter>
          <AlertSheetAction variant="destructive">Delete</AlertSheetAction>
          <AlertSheetCancel>Cancel</AlertSheetCancel>
        </AlertSheetFooter>
      </AlertSheetContent>
    </AlertSheet>
  ),
} satisfies Meta<PlaygroundArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bottom: Story = {};
export const Top: Story = { args: { side: 'top' } };
export const Right: Story = { args: { side: 'right' } };
export const Left: Story = { args: { side: 'left' } };

// The one behaviour that justifies this component over plain Sheet: a backdrop tap
// does nothing, rather than silently answering "no" to a destructive prompt.
export const BackdropDoesNotDismiss: Story = {
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    const alertSheet = await screen.findByRole('alertdialog');

    await userEvent.click(document.body);

    expect(screen.getByRole('alertdialog')).toBe(alertSheet);
  },
};
