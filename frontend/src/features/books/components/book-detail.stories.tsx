import { Suspense } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  getBooksGetBookMockHandler,
  getBooksListBookEngagementsMockHandler,
} from '@/api/generated/books/books.msw';
import { buildBook, buildEngagement } from '@/test/data-generators';
import { BookDetail } from './book-detail';

const piranesi = buildBook({
  genres: ['Fantasy', 'Literary fiction'],
  default_page_count: 272,
  default_audio_minutes: 155,
  original_language: 'en',
  publication_date: '2020-09-15',
});

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
      getBooksListBookEngagementsMockHandler([buildEngagement({ title: piranesi.title })])
    );
  },
} satisfies Meta<typeof BookDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
