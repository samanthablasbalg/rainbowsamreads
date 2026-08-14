import type { Meta, StoryObj } from '@storybook/react-vite';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { AuthenticatedShell } from './authenticated-shell';

const reader = { id: 'a-user', email: 'reader@example.com', picture: null };

const meta = {
  component: AuthenticatedShell,
  tags: ['!autodocs'],
  async beforeEach({ msw }) {
    msw.use(getAuthMeMockHandler(reader));
  },
} satisfies Meta<typeof AuthenticatedShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = {
  globals: { viewport: 'pixel8Pro' },
};

export const Desktop: Story = {
  globals: { viewport: 'xl' },
};
