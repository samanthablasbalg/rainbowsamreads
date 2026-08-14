import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePrecision, Format, ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { ReadingCard } from './reading-card';

const baseEngagement = {
  id: 'engagement-1',
  book: {
    id: 'book-1',
    title: 'Piranesi',
    authors: [{ id: 'author-1', name: 'Susanna Clarke' }],
    google_books_id: null,
    default_cover_url: null,
    default_page_count: 272,
    default_audio_minutes: null,
    original_language: null,
    genres: [],
    publication_date: null,
    publication_date_precision: DatePrecision.year,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  formats: [Format.print],
  cover_url: null,
  status: ReadingStatus.reading,
  started_on: '2025-01-01',
  finished_on: null,
  abandoned_on: null,
  resume_from_page: 132,
  resume_from_minute: 0,
  completion_pct: 52,
  review: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const meta = {
  component: ReadingCard,
  args: {
    engagement: baseEngagement,
  },
  render: (args) => (
    <ul>
      <ReadingCard {...args} />
    </ul>
  ),
} satisfies Meta<typeof ReadingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Print: Story = {};

export const Audiobook: Story = {
  args: {
    engagement: {
      ...baseEngagement,
      book: { ...baseEngagement.book, title: 'The House in the Cerulean Sea' },
      formats: [Format.audio],
      completion_pct: 30,
    },
  },
};

export const MultiFormat: Story = {
  args: {
    engagement: { ...baseEngagement, formats: [Format.print, Format.audio] },
  },
};

export const NotStarted: Story = {
  args: { engagement: { ...baseEngagement, completion_pct: null } },
};
