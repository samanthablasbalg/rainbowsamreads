import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Button } from './button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';

// Opened by `play` rather than `defaultOpen` -- see sheet.stories.tsx for why: a modal
// dialog portals a fixed, full-viewport backdrop and traps focus, so mounting more than
// one open at a time (as the docs page would with `defaultOpen`) stacks backdrops and
// makes the canvas unusable. Play functions don't run in docs, so docs gets a trigger
// button and the canvas still shows the dialog open.
const meta = {
  component: Dialog,
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    // screen, not `within(canvasElement)`: DialogContent renders through a portal, so
    // it lands outside the story's own element.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  },
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button variant="outline">Open</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>A one-line description of what this dialog does.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// `showCloseButton` lives on DialogContent, not the Dialog root, so this variant needs
// its own render rather than an args override.
export const NoCloseButton: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger render={<Button variant="outline">Open</Button>} />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Dialog title</DialogTitle>
          <DialogDescription>A one-line description of what this dialog does.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
