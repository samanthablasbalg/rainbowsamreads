import type { Meta, StoryObj } from '@storybook/react-vite';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { AuthenticatedShell } from './authenticated-shell';

const reader = { id: 'a-user', email: 'reader@example.com', picture: null };

// No docs page: the viewport tool sizes the preview iframe, and docs renders every
// story of a file inline in one iframe -- so Mobile and Desktop would render
// identically there, labelled as if they differed. The canvas stories are the point.
const meta = {
  component: AuthenticatedShell,
  tags: ['!autodocs'],
  // The handler is given an explicit reader rather than left to orval's faker mock,
  // which is unseeded: it would invent a fresh email per run, and half the time a
  // `picture` of random letters, which the avatar turns into a live image request.
  async beforeEach({ msw }) {
    msw.use(getAuthMeMockHandler(reader));
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
