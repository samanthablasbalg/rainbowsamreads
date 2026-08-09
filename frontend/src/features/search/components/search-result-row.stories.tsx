import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  BookSearchResultState,
  ReadingStatus,
  type BookSearchResult,
} from '@/api/generated/readingTracker.schemas';
import { Combobox, ComboboxContent, ComboboxList } from '@/components/ui/combobox';
import { SearchResultRow } from './search-result-row';

const result: BookSearchResult = {
  state: BookSearchResultState.in_library,
  book_id: 'book-1',
  google_books_id: null,
  title: 'Piranesi',
  authors: ['Susanna Clarke'],
  published_date: null,
  page_count: 245,
  categories: [],
  cover_url: null,
  language: 'en',
  status: ReadingStatus.reading,
};

// The row is a ComboboxItem, so it only renders inside an open Combobox popup -- hence
// the wrapper, held open, rather than a bare row. `items` is what Base UI needs to know
// the list is non-empty; `filter={null}` matches how SearchBar drives it, the filtering
// having already happened on the server.
const meta = {
  component: SearchResultRow,
  args: { result, importing: false, onAdd: () => {}, onImport: () => {} },
  render: (args) => (
    <Combobox items={[args.result]} filter={null} value={null} defaultOpen>
      <ComboboxContent>
        <ComboboxList>
          <SearchResultRow {...args} />
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  ),
} satisfies Meta<typeof SearchResultRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// The three states, which decide both the badge and the single action offered.
export const InLibrary: Story = {};

export const InLibraryFinished: Story = {
  args: { result: { ...result, status: ReadingStatus.finished } },
};

// A book the app knows but you have no engagement with: Add, and no status badge.
export const InCatalog: Story = {
  args: {
    result: { ...result, state: BookSearchResultState.in_catalog, status: null },
  },
};

export const NotInApp: Story = {
  args: {
    result: {
      ...result,
      state: BookSearchResultState.not_in_app,
      book_id: null,
      google_books_id: 'gb-1',
      title: 'The Left Hand of Darkness',
      authors: ['Ursula K. Le Guin'],
      status: null,
    },
  },
};

// Held while the import request is in flight -- the only state the row itself owns.
export const Importing: Story = {
  args: { ...NotInApp.args, importing: true },
};

// Multiple authors and a title long enough to truncate.
export const ManyAuthors: Story = {
  args: {
    result: {
      ...result,
      title: 'The Rise and Fall of the Third Chimpanzee: Evolution and Human Life',
      authors: ['Susanna Clarke', 'Neil Gaiman', 'Terry Pratchett'],
    },
  },
};
