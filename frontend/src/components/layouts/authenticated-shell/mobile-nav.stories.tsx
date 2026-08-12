import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileNav } from './mobile-nav';

// MobileNav takes no props -- which link is active comes entirely from the URL, so
// each story sets it via the `initialEntries` parameter that preview.tsx's global
// MemoryRouter reads, rather than args driving a state.
const meta = {
  component: MobileNav,
} satisfies Meta<typeof MobileNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HomeActive: Story = {
  parameters: { initialEntries: ['/home'] },
};

export const LibraryActive: Story = {
  parameters: { initialEntries: ['/library'] },
};
