import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { AccountMenuDropdown, AccountMenuSheet } from './account-menu';

const reader = { id: 'a-user', email: 'reader@example.com', picture: null };

// Neither component takes a prop to force itself open -- the real app only ever
// mounts them closed -- so `play` clicks the trigger the way a reader would, instead
// of adding a defaultOpen prop with no caller outside Storybook.
//
// The assertions go through `screen`, not `canvas`: both menus render through a portal,
// which puts them outside the story's own element. They assert presence rather than
// visibility because both animate in from opacity-0 and findByRole resolves as soon as
// the element mounts -- toBeVisible would race the transition.
async function openDropdown({ canvasElement }: { canvasElement: HTMLElement }) {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole('button', { name: /reader@example\.com/ }));
  expect(await screen.findByRole('menu')).toBeInTheDocument();
}

async function openSheet({ canvasElement }: { canvasElement: HTMLElement }) {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole('button', { name: 'Account' }));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
}

// No `component`: the two exports are different presentations of one set of actions
// (see account-menu.tsx's comment), not variants of a single component.
const meta = {
  async beforeEach({ msw }) {
    msw.use(getAuthMeMockHandler(reader));
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dropdown: Story = {
  render: () => <AccountMenuDropdown />,
  play: openDropdown,
};

export const Sheet: Story = {
  render: () => <AccountMenuSheet />,
  play: openSheet,
};
