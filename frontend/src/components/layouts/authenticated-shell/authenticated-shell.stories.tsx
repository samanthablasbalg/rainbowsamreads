import type { Meta, StoryObj } from '@storybook/react-vite';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { AuthenticatedShell } from './authenticated-shell';

const meta = {
  component: AuthenticatedShell,
  tags: ['autodocs'],
  async beforeEach({ msw }) {
    msw.use(getAuthMeMockHandler());
  },
} satisfies Meta<typeof AuthenticatedShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// Below `lg` Tailwind shows the pill nav; at `lg` and up it shows the rail.
// authenticated-shell.spec.tsx explicitly leaves this switch to Playwright because
// jsdom has no layout engine to resolve `hidden` -- Storybook's browser mode does,
// so pinning the viewport per story is what closes that gap.
export const Mobile: Story = {
  globals: { viewport: 'pixel8Pro' },
};

export const Desktop: Story = {
  globals: { viewport: 'xl' },
};
