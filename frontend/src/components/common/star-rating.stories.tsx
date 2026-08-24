import type { Meta, StoryObj } from '@storybook/react-vite';
import { StarRating } from './star-rating';

const meta = {
  component: StarRating,
  args: { rating: 4 },
} satisfies Meta<typeof StarRating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Whole: Story = {};

export const Quarter: Story = { args: { rating: 3.25 } };

export const Half: Story = { args: { rating: 3.5 } };

export const ThreeQuarters: Story = { args: { rating: 3.75 } };

export const Full: Story = { args: { rating: 5 } };

export const Unrated: Story = { args: { rating: null } };
