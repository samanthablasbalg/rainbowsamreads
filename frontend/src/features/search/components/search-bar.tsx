import { useRef, useState } from 'react';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import {
  getBooksListBooksQueryKey,
  useBooksImportBook,
  useBooksSearchBooks,
} from '@/api/generated/books/books';
import {
  BookSearchResultState,
  EngagementCreateStatus,
  type BookSearchResult,
} from '@/api/generated/readingTracker.schemas';
import { ErrorText } from '@/components/common/error-text';
import { FormatPickSheet, type FormatPickSheetProps } from '@/components/common/format-pick-sheet';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxLabel,
  ComboboxList,
} from '@/components/ui/combobox';
import { InputGroupAddon } from '@/components/ui/input-group';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SearchButton } from './search-button';
import { SearchResultRow } from './search-result-row';

const DEBOUNCE_MS = 300;

const MIN_QUERY_LENGTH = 2;

const ADD_STATUSES = [
  EngagementCreateStatus.reading,
  EngagementCreateStatus.finished,
  EngagementCreateStatus.dnf,
];

type PendingSheet = Omit<FormatPickSheetProps, 'open' | 'onOpenChange'>;

const SECTIONS: { heading: string; hint: string | null; state: BookSearchResultState }[] = [
  { heading: 'In your library', hint: null, state: BookSearchResultState.in_library },
  {
    heading: 'Already in the app',
    hint: 'add to your library',
    state: BookSearchResultState.in_catalog,
  },
  {
    heading: 'New — from Google Books',
    hint: 'import into the app',
    state: BookSearchResultState.not_in_app,
  },
];

export function SearchBar() {
  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState<PendingSheet | null>(null);
  const queryClient = useQueryClient();

  const importBook = useBooksImportBook({
    mutation: {
      onSuccess: async (book) => {
        await queryClient.invalidateQueries({ queryKey: getBooksListBooksQueryKey() });
        collapse();
        setSheet({
          bookId: book.id,
          title: book.title,
          audioMinutes: book.default_audio_minutes,
          statuses: ADD_STATUSES,
          cancelLabel: 'No thanks — just import',
        });
      },
    },
  });

  function collapse() {
    setExpanded(false);
    importBook.reset();
  }

  // A catalog result carries no audio length, so picking Audio always stops to ask.
  function handleAdd(result: BookSearchResult) {
    collapse();
    setSheet({
      bookId: result.book_id!,
      title: result.title,
      audioMinutes: null,
      statuses: ADD_STATUSES,
    });
  }

  const sheetElement = sheet && (
    <FormatPickSheet {...sheet} open onOpenChange={(open) => !open && setSheet(null)} />
  );

  return (
    <>
      {expanded ? (
        <SearchPanel
          onCollapse={collapse}
          onAdd={handleAdd}
          onImport={(result) =>
            importBook.mutate({ data: { google_books_id: result.google_books_id! } })
          }
          importingGoogleBooksId={
            importBook.isPending ? importBook.variables.data.google_books_id : null
          }
          importFailed={importBook.isError}
        />
      ) : (
        <SearchButton onClick={() => setExpanded(true)} />
      )}
      {sheetElement}
    </>
  );
}

type SearchPanelProps = {
  onCollapse: () => void;
  onAdd: (result: BookSearchResult) => void;
  onImport: (result: BookSearchResult) => void;
  importingGoogleBooksId: string | null;
  importFailed: boolean;
};

function SearchPanel({
  onCollapse,
  onAdd,
  onImport,
  importingGoogleBooksId,
  importFailed,
}: SearchPanelProps) {
  // The popup anchors to this, not the input: the input sits inside an InputGroup and so
  // starts after the leading icon.
  const barRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  // Both, not just the debounced one: the debounce still holds the old query for
  // DEBOUNCE_MS after the field is cleared, which would keep the panel open on stale
  // results.
  const enabled =
    query.trim().length >= MIN_QUERY_LENGTH && debouncedQuery.length >= MIN_QUERY_LENGTH;

  const { data, isFetching, isError } = useBooksSearchBooks(
    { q: debouncedQuery },
    { query: { enabled, placeholderData: keepPreviousData } }
  );

  const results: BookSearchResult[] = enabled && data ? data : [];

  return (
    <>
      <div
        ref={barRef}
        // Only reached while the popup is shut. Once it is open Base UI handles Escape
        // itself and stops the event here, which is what `onOpenChange` below is for.
        onKeyDown={(event) => event.key === 'Escape' && onCollapse()}
        // Focus leaving the bar, not any outside click, so it stays open while the
        // pointer is in the results list.
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) onCollapse();
        }}
        className="absolute inset-y-0 right-4 z-20 flex w-[calc(100%---spacing(8))] items-center bg-background transition-[width] duration-200 ease-out lg:right-6 lg:w-96 starting:w-9"
      >
        <Combobox
          items={results}
          filter={null}
          value={null}
          inputValue={query}
          onInputValueChange={setQuery}
          open={enabled}
          onOpenChange={(open) => !open && onCollapse()}
        >
          <ComboboxInput
            autoFocus
            showTrigger={false}
            showClear
            aria-label="Search books"
            placeholder="Search books"
            className="w-full"
          >
            <InputGroupAddon>
              <HugeiconsIcon icon={Search01Icon} />
            </InputGroupAddon>
          </ComboboxInput>

          <ComboboxContent anchor={barRef}>
            <ComboboxList>
              {SECTIONS.map(({ heading, hint, state }) => {
                const sectionResults = results.filter((result) => result.state === state);
                if (sectionResults.length === 0) return null;

                return (
                  <ComboboxGroup key={state}>
                    <ComboboxLabel>
                      {heading}
                      {hint && <span className="opacity-70"> · {hint}</span>}
                    </ComboboxLabel>
                    {sectionResults.map((result) => (
                      <SearchResultRow
                        key={result.book_id ?? result.google_books_id}
                        result={result}
                        importing={importingGoogleBooksId === result.google_books_id}
                        onAdd={() => onAdd(result)}
                        onImport={() => onImport(result)}
                      />
                    ))}
                  </ComboboxGroup>
                );
              })}
            </ComboboxList>

            {/* Outside ComboboxEmpty, which only renders when the list is empty -- a failed
              import leaves the results it was launched from on screen. */}
            {importFailed && (
              <ErrorText className="px-3 py-2">Import failed — please try again.</ErrorText>
            )}

            <ComboboxEmpty>
              {isFetching ? (
                'Searching…'
              ) : isError ? (
                <span role="alert">Search failed — please try again.</span>
              ) : (
                'No results.'
              )}
            </ComboboxEmpty>
          </ComboboxContent>
        </Combobox>
      </div>
    </>
  );
}
