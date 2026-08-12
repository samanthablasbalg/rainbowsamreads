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

// One character matches most of the catalog, which is noise rather than a result set.
const MIN_QUERY_LENGTH = 2;

// Adding from search is not necessarily starting a read -- a book you have already
// finished is exactly the kind of thing you go looking for -- so all three are offered.
const ADD_STATUSES = [
  EngagementCreateStatus.reading,
  EngagementCreateStatus.finished,
  EngagementCreateStatus.dnf,
];

type PendingSheet = Omit<FormatPickSheetProps, 'open' | 'onOpenChange'>;

// The backend returns one flat, deduped list; the grouping is ours. Fixed order, and a
// section with nothing in it is not rendered -- so "New from Google Books" being absent
// means Google offered nothing this call, whether it was reachable or not.
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

// Global book search: your library, the shared catalog, and Google Books, in one query.
//
// Two states. Collapsed it is the icon button that has always been in the header.
// Expanded it is a search field laid over the header row -- absolutely positioned, so
// the wordmark, streak and account menu are covered rather than squashed. It is
// right-anchored and animates its own width, which is why it is `right-4 w-[...]`
// rather than `inset-x-4`: only one of the two can be transitioned.
//
// Everything below the field -- the popup, its position, dismissal, arrow-key
// navigation through results -- is Base UI's combobox. `filter={null}` turns off its
// client-side filtering, because the filtering already happened on the server.
//
// Nothing survives collapsing it. No query in the URL, no recent searches: reopening is
// blank, deliberately.
export function SearchBar() {
  const [expanded, setExpanded] = useState(false);
  // The sheet the two row actions open. Held here rather than in the panel, and kept
  // out of `expanded`, because both actions collapse the bar first -- a dialog stacked
  // on the results popup, over a bar that collapses the moment focus leaves it, is not
  // a workable place to put a three-step form.
  const [sheet, setSheet] = useState<PendingSheet | null>(null);
  const queryClient = useQueryClient();

  const importBook = useBooksImportBook({
    mutation: {
      onSuccess: async (book) => {
        // The catalog gained a book, which is a different list from the search results.
        await queryClient.invalidateQueries({ queryKey: getBooksListBooksQueryKey() });
        collapse();
        setSheet({
          bookId: book.id,
          title: book.title,
          audioMinutes: book.default_audio_minutes,
          statuses: ADD_STATUSES,
          // Importing is a complete action on its own -- the book is in the catalog
          // either way -- so backing out here is a real answer, not a cancellation.
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

// The field and the query it drives, mounted only while the bar is open. That is what
// makes "nothing survives collapsing it" true rather than merely hidden: the query
// observer goes with it, and `keepPreviousData` below cannot reach back past a collapse
// to answer the next search with the last one's results.
function SearchPanel({
  onCollapse,
  onAdd,
  onImport,
  importingGoogleBooksId,
  importFailed,
}: SearchPanelProps) {
  // The popup anchors to this rather than to the input, which sits inside an InputGroup
  // and so starts after the leading icon -- anchoring there aligns the panel to the
  // start of the text and sizes it to the input alone.
  const barRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  // Both, not just the debounced one: the debounce still holds the old query for
  // DEBOUNCE_MS after the field is cleared, which keeps the panel open on stale results.
  const enabled =
    query.trim().length >= MIN_QUERY_LENGTH && debouncedQuery.length >= MIN_QUERY_LENGTH;

  const { data, isFetching, isError } = useBooksSearchBooks(
    { q: debouncedQuery },
    // keepPreviousData holds the last results on screen while the next query is in
    // flight, so refining a search dims rather than empties the panel.
    { query: { enabled, placeholderData: keepPreviousData } }
  );

  const results: BookSearchResult[] = enabled && data ? data : [];

  return (
    <>
      <div
        ref={barRef}
        // Only reached while the popup is shut -- a query under MIN_QUERY_LENGTH. Once it
        // is open Base UI handles Escape itself and stops the event here, which is what
        // `onOpenChange` below is for.
        onKeyDown={(event) => event.key === 'Escape' && onCollapse()}
        // Collapsing on focus leaving the bar, rather than on any outside click, is what
        // keeps it open while the pointer is in the results list.
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) onCollapse();
        }}
        className="absolute inset-y-0 right-4 z-20 flex w-[calc(100%---spacing(8))] items-center bg-background transition-[width] duration-200 ease-out lg:right-6 lg:w-96 starting:w-9"
      >
        <Combobox
          items={results}
          filter={null}
          // Held at null so no row is ever the selected one -- this list is a set of
          // destinations, not a value being picked. `onValueChange` is where opening the
          // book page will hang once that page exists.
          value={null}
          inputValue={query}
          onInputValueChange={setQuery}
          // Visibility is ours -- the popup is exactly "the query is long enough" -- so
          // Base UI cannot close itself. onOpenChange is it asking to be dismissed
          // (Escape, a click outside), and for this bar dismissing the popup means
          // collapsing the whole thing.
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
              <p role="alert" className="px-3 py-2 text-sm text-destructive">
                Import failed — please try again.
              </p>
            )}

            <ComboboxEmpty>
              {isFetching ? (
                'Searching…'
              ) : isError ? (
                // Announced, like the import failure above it -- both arrive well after
                // the keystroke that caused them.
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
