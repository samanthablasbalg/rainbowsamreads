import type { Meta, StoryObj } from '@storybook/react-vite';
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

// One composed example rather than a flat story per DropdownMenuItem `variant`: this
// tree already renders every part the module exports -- including a destructive item --
// in one open popup, so a second story isolating that variant wouldn't add coverage.
//
// children is supplied by `render`, not `args` -- see avatar.stories.tsx for why.
const meta = {
  component: DropdownMenu,
  tags: ['autodocs'],
  args: {
    defaultOpen: true,
  },
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
