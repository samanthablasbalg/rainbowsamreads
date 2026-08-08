import { useRef, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { useBooksSearchBooks } from '@/api/generated/books/books';
import {
  BookSearchResultState,
  type BookSearchResult,
} from '@/api/generated/readingTracker.schemas';
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
  // The popup anchors to this rather than to the input, which sits inside an InputGroup
  // and so starts after the leading icon -- anchoring there aligns the panel to the
  // start of the text and sizes it to the input alone.
  const barRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  // Both, not just the debounced one: the debounce still holds the old query for
  // DEBOUNCE_MS after the field is cleared, which keeps the panel open on stale results
  // -- and flashes them back if the bar is reopened inside that window.
  const enabled =
    query.trim().length >= MIN_QUERY_LENGTH && debouncedQuery.length >= MIN_QUERY_LENGTH;

  const { data, isFetching, isError } = useBooksSearchBooks(
    { q: debouncedQuery },
    // keepPreviousData holds the last results on screen while the next query is in
    // flight, so refining a search dims rather than empties the panel.
    { query: { enabled, placeholderData: keepPreviousData } }
  );

  const results: BookSearchResult[] = enabled && data ? data : [];

  function collapse() {
    setExpanded(false);
    setQuery('');
  }

  if (!expanded) {
    return <SearchButton onClick={() => setExpanded(true)} />;
  }

  return (
    <div
      ref={barRef}
      // Only reached while the popup is shut -- a query under MIN_QUERY_LENGTH. Once it
      // is open Base UI handles Escape itself and stops the event here, which is what
      // `onOpenChange` below is for.
      onKeyDown={(event) => event.key === 'Escape' && collapse()}
      // Collapsing on focus leaving the bar, rather than on any outside click, is what
      // keeps it open while the pointer is in the results list.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) collapse();
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
        onOpenChange={(open) => !open && collapse()}
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
                    />
                  ))}
                </ComboboxGroup>
              );
            })}
          </ComboboxList>

          <ComboboxEmpty>
            {isFetching
              ? 'Searching…'
              : isError
                ? 'Search failed — please try again.'
                : 'No results.'}
          </ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
