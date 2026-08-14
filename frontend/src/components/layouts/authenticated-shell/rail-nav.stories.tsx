import type { Meta, StoryObj } from '@storybook/react-vite';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { RailNav } from './rail-nav';

const reader = { id: 'a-user', email: 'reader@example.com', picture: null };

const meta = {
  component: RailNav,
  args: {
    streakDays: 7,
  },
  async beforeEach({ msw }) {
    msw.use(getAuthMeMockHandler(reader));
  },
} satisfies Meta<typeof RailNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HomeActive: Story = {
  parameters: { initialEntries: ['/home'] },
};

export const LibraryActive: Story = {
  parameters: { initialEntries: ['/library'] },
};
