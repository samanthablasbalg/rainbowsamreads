import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';
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

// Opened by `play` rather than `defaultOpen`, because the sheet is a modal dialog: it
// portals a fixed, full-viewport backdrop and traps focus. On the docs page all four
// stories mount at once, which would stack four backdrops over the page and make it
// unusable. Play functions don't run in docs (`autoplay` defaults to false), so docs
// gets four trigger buttons and the canvas still shows the sheet open.
const meta = {
  component: Sheet,
  args: {
    side: 'right',
  },
  argTypes: {
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
    },
  },
  async play({ canvasElement }) {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open' }));
    // screen, not `within(canvasElement)`: SheetContent renders through a portal, so
    // it lands outside the story's own element. toBeInTheDocument, not toBeVisible --
    // the panel animates in from opacity-0, and findByRole resolves the moment it
    // mounts, so a visibility assertion races the transition.
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
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
export const Right: Story = {};
export const Bottom: Story = { args: { side: 'bottom' } };
export const Left: Story = { args: { side: 'left' } };
