import type { Meta, StoryObj } from '@storybook/react-vite';
import { MobileNav } from './mobile-nav';

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
