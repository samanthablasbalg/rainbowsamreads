import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePrecision } from '@/api/generated/readingTracker.schemas';
import { buildBook } from '@/test/data-generators';
import { BookChips, BookHeader } from './book-header';

const book = buildBook({
  publication_date: '2020-09-15',
  publication_date_precision: DatePrecision.day,
  genres: ['Fantasy', 'Mystery', 'Queer'],
});

// The two exports always render together on the page, so the stories show them stacked
// rather than pretending either is used alone.
const meta = {
  component: BookHeader,
  args: { book },
  render: (args) => (
    <div className="flex flex-col gap-4">
      <BookHeader {...args} />
      <BookChips {...args} />
    </div>
  ),
} satisfies Meta<typeof BookHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// Google Books often knows only the year, and the chips are whatever it happened to store.
export const YearOnly: Story = {
  args: {
    book: buildBook({
      publication_date: '2020-01-01',
      publication_date_precision: DatePrecision.year,
      genres: ['Fantasy'],
    }),
  },
};

export const Audiobook: Story = {
  args: {
    book: buildBook({
      default_page_count: null,
      default_audio_minutes: 397,
      original_language: 'ja',
      genres: ['Sci-fi'],
    }),
  },
};

// Nothing but a title and an author -- the header still has to look deliberate.
export const Bare: Story = {
  args: { book: buildBook({ default_page_count: null }) },
};

export const LongTitle: Story = {
  args: {
    book: buildBook({
      title: 'The Rise and Fall of the Third Chimpanzee: Evolution and Human Life',
      genres: ['Nonfiction', 'Science'],
    }),
  },
};
