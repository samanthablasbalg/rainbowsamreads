import type { Meta, StoryObj } from '@storybook/react-vite';
import { userEvent, within } from 'storybook/test';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { AccountMenuDropdown, AccountMenuSheet } from './account-menu';

const reader = { id: 'a-user', email: 'reader@example.com', picture: null };

// Neither component takes a prop to force itself open -- the real app only ever
// mounts them closed -- so `play` clicks the trigger the way a reader would, instead
// of adding a defaultOpen prop with no caller outside Storybook.
async function openDropdown({ canvasElement }: { canvasElement: HTMLElement }) {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole('button', { name: /reader@example\.com/ }));
}

async function openSheet({ canvasElement }: { canvasElement: HTMLElement }) {
  const canvas = within(canvasElement);
  await userEvent.click(await canvas.findByRole('button', { name: 'Account' }));
}

// No `component`: the two exports are different presentations of one set of actions
// (see account-menu.tsx's comment), not variants of a single component.
const meta = {
  tags: ['autodocs'],
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
