import { Suspense } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  getBooksGetBookMockHandler,
  getBooksListBookEngagementsMockHandler,
  getBooksListBookRecommendationsMockHandler,
} from '@/api/generated/books/books.msw';
import { getRecommendersListRecommendersMockHandler } from '@/api/generated/recommenders/recommenders.msw';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { BookDetail } from './book-detail';

const piranesi = buildBook({
  genres: ['Fantasy', 'Literary fiction'],
  default_page_count: 272,
  default_audio_minutes: 155,
  original_language: 'en',
  publication_date: '2020-09-15',
});

const recommendation = {
  recommender: { id: 'recommender-1', name: 'Ursula K. Le Guin' },
  note: null,
};

const meta = {
  component: BookDetail,
  args: { bookId: piranesi.id },
  decorators: [
    (Story) => (
      <Suspense fallback={null}>
        <Story />
      </Suspense>
    ),
  ],
  async beforeEach({ msw }) {
    msw.use(
      getBooksGetBookMockHandler(piranesi),
      getBooksListBookEngagementsMockHandler([buildEngagement({ title: piranesi.title })]),
      getBooksListBookRecommendationsMockHandler([]),
      getRecommendersListRecommendersMockHandler([])
    );
  },
} satisfies Meta<typeof BookDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoRecommendationMobile: Story = {
  globals: { viewport: 'pixel8Pro' },
};

export const NoRecommendationDesktop: Story = {
  globals: { viewport: 'xl' },
};

export const OneRecommenderMobile: Story = {
  globals: { viewport: 'pixel8Pro' },
  async beforeEach({ msw }) {
    msw.use(getBooksListBookRecommendationsMockHandler([recommendation]));
  },
};

export const OneRecommenderDesktop: Story = {
  globals: { viewport: 'xl' },
  async beforeEach({ msw }) {
    msw.use(getBooksListBookRecommendationsMockHandler([recommendation]));
  },
};
