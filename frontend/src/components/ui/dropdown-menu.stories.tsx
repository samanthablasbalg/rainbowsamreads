import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './dropdown-menu';

// Opened by `play` rather than `defaultOpen` -- see sheet.stories.tsx for why.
async function openMenu({ canvasElement }: { canvasElement: HTMLElement }) {
  await userEvent.click(within(canvasElement).getByRole('button', { name: 'Options' }));
  expect(await screen.findByRole('menu')).toBeInTheDocument();
}

// One composed example rather than a flat story per DropdownMenuItem `variant`: this
// tree already renders every part the module exports -- including a destructive item --
// in one open popup, so a second story isolating that variant wouldn't add coverage.
//
// children is supplied by `render`, not `args` -- see avatar.stories.tsx for why.
const meta = {
  component: DropdownMenu,
  play: openMenu,
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger render={<Button variant="outline">Options</Button>} />
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>My account</DropdownMenuLabel>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem defaultChecked>Show archived</DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup defaultValue="list">
          <DropdownMenuRadioItem value="list">List view</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="grid">Grid view</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>Email</DropdownMenuItem>
            <DropdownMenuItem>Copy link</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete account</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// DropdownMenuSubContent only mounts once the submenu opens, so without this story the
// whole sub- branch of the tree above never renders -- nothing puts it in front of the
// a11y check or a snapshot. This asserts it rendered, not that Base UI's submenu logic
// is correct; that is the library's own concern.
//
// A story-level play replaces the meta one rather than running after it, so this opens
// the menu itself first.
export const Submenu: Story = {
  async play(context) {
    await openMenu(context);
    await userEvent.hover(screen.getByRole('menuitem', { name: 'Share' }));
    expect(await screen.findByRole('menuitem', { name: 'Email' })).toBeInTheDocument();
  },
};
