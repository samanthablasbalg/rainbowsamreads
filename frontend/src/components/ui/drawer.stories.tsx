import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Button } from './button';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from './drawer';

// Every variant this exposes -- `swipeDirection`, `showSwipeHandle`, `snapPoints` -- is a
// prop of the Drawer root, so args pass straight through and the render function needs no
// widening. (Sheet needed that dance because its `side` sat on SheetContent instead.)
//
// Opened by `play` rather than `defaultOpen`, for the same reason sheet.stories.tsx is:
// this is a modal dialog that portals a full-viewport backdrop and traps focus, and the
// docs page mounts every story at once. Play functions don't run in docs, so docs gets
// trigger buttons and the canvas still shows each drawer open.
const meta = {
  component: Drawer,
  argTypes: {
    swipeDirection: {
      control: 'select',
      options: ['down', 'up', 'left', 'right'],
    },
  },
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    // screen, not `within(canvasElement)`: DrawerContent portals out of the story's own
    // element. toBeInTheDocument, not toBeVisible -- the popup animates in from its
    // closed transform, and findByRole resolves the moment it mounts.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger render={<Button variant="outline">Open</Button>} />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer title</DrawerTitle>
          <DrawerDescription>A one-line description of what this drawer does.</DrawerDescription>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  ),
} satisfies Meta<typeof Drawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Down: Story = {};
export const Up: Story = { args: { swipeDirection: 'up' } };
export const Left: Story = { args: { swipeDirection: 'left' } };
export const Right: Story = { args: { swipeDirection: 'right' } };

export const WithSwipeHandle: Story = { args: { showSwipeHandle: true } };

// Fractions of the viewport height. With snap points the popup is sized to 100dvh and
// the offset does the positioning, so this looks quite different from the stories above
// even though only one prop changed.
export const SnapPoints: Story = { args: { snapPoints: [0.4, 1], showSwipeHandle: true } };
