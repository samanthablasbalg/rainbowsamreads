import type { Meta, StoryObj } from '@storybook/react-vite';
import { getAuthMeMockHandler } from '@/api/generated/auth/auth.msw';
import { AccountMenuDropdown } from './account-menu';

// This story exists to prove MSW's browser worker is wired up (§4.2), not to
// enumerate AccountMenu's states -- that's §4.6's job, once the story-entry
// test is being applied surface-wide.
//
// context.msw is the running SetupWorker instance, exposed by addonMsw()'s own
// beforeEach in .storybook/preview.tsx -- registering a handler here is the
// browser-worker equivalent of server.use(...) in account-menu.spec.tsx.
const meta = {
  component: AccountMenuDropdown,
  async beforeEach({ msw }) {
    msw.use(getAuthMeMockHandler({ id: 'a-user', email: 'reader@example.com', picture: null }));
  },
} satisfies Meta<typeof AccountMenuDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
