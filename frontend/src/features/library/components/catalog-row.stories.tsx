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

export const Default: Story = {};

export const AudioOnly: Story = {
  args: { book: { ...book, default_page_count: null, default_audio_minutes: 512 } },
};

export const BothLengths: Story = {
  args: { book: { ...book, default_audio_minutes: 512 } },
};

export const NoLength: Story = {
  args: { book: { ...book, default_page_count: null, default_audio_minutes: null } },
};

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
