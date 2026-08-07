import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePrecision, type BookRead } from '@/api/generated/readingTracker.schemas';
import { CatalogRow } from './catalog-row';

const book: BookRead = {
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
};

// The row renders an <li>, so every story supplies the <ul> it belongs in rather than
// leaving a list item loose in the document -- which axe reports, correctly.
const meta = {
  component: CatalogRow,
  args: { book },
  render: (args) => (
    <ul>
      <CatalogRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof CatalogRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// Every story leaves `default_cover_url` null. That is the common case anyway -- a book
// only has a cover if it was imported with one -- and a real src would be a live network
// request from the headless browser these run in, which is why cover-image.stories.tsx
// has no loaded-image story either. The cover is CoverImage's behaviour, not this row's.
export const Default: Story = {};

// The length combinations, which are the row's only real branch.
export const AudioOnly: Story = {
  args: { book: { ...book, default_page_count: null, default_audio_minutes: 512 } },
};

export const BothLengths: Story = {
  args: { book: { ...book, default_audio_minutes: 512 } },
};

export const NoLength: Story = {
  args: { book: { ...book, default_page_count: null, default_audio_minutes: null } },
};

// Multiple authors and a title long enough to hit the truncation.
export const ManyAuthors: Story = {
  args: {
    book: {
      ...book,
      title: 'The Rise and Fall of the Third Chimpanzee: Evolution and Human Life',
      authors: [
        { id: 'author-1', name: 'Susanna Clarke' },
        { id: 'author-2', name: 'Neil Gaiman' },
        { id: 'author-3', name: 'Terry Pratchett' },
      ],
    },
  },
};
