import type { Meta, StoryObj } from '@storybook/react-vite';
import { CoverImage } from './cover-image';

const meta = {
  component: CoverImage,
  args: {
    src: null,
    title: 'Piranesi',
  },
} satisfies Meta<typeof CoverImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fallback: Story = {};
