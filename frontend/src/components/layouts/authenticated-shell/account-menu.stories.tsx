import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, within } from 'storybook/test';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { AccountMenuDropdown, AccountMenuSheet } from './account-menu';

const reader = { id: 'a-user', email: 'reader@example.com', picture: null };

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
