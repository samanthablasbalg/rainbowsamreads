import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, type ReactNode } from 'react';
import { expect, screen, userEvent, within } from 'storybook/test';
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

// Captured at import time, before any story has swapped it, so the cleanup below always
// restores the browser's real implementation rather than another story's stub.
const realMatchMedia = window.matchMedia;

// Storybook runs under whatever pointer the machine running it has -- in CI and on a
// laptop, always fine -- so the coarse branch is unreachable without forcing the query.
// A vitest spec would reach for `vi.stubGlobal`, which browser stories lack.
function withPointer(coarse: boolean) {
  return function PointerDecorator(Story: () => ReactNode) {
    window.matchMedia = ((query: string) =>
      ({
        media: query,
        matches: coarse,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        addListener: () => {},
        removeListener: () => {},
      }) as MediaQueryList) as typeof window.matchMedia;

    useEffect(() => () => void (window.matchMedia = realMatchMedia), []);

    return <Story />;
  };
}

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
