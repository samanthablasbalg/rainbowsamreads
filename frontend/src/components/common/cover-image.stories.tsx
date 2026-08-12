import type { Meta, StoryObj } from '@storybook/react-vite';
import { CoverImage } from './cover-image';

// No "loaded image" story, for the same reason avatar.stories.tsx skips
// AvatarImage: a real `src` is a live network request in the remote headless
// browser these stories run in. The only bespoke behaviour here -- the
// no-cover and failed-load branches rendering the same fallback tile -- is
// exactly what a null `src` already demonstrates without one.
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
