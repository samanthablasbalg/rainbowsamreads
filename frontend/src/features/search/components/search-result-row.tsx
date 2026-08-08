import type { BookSearchResult } from '@/api/generated/readingTracker.schemas';
import { CoverImage } from '@/components/common/cover-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComboboxItem } from '@/components/ui/combobox';

const STATUS_LABEL = {
  reading: 'Reading',
  finished: 'Finished',
  dnf: 'DNF',
} as const;

// One row of global search, for a result in any of the three states. The state decides
// both the badge and the single action, and the three are mutually exclusive:
//
//   in_library  -- your reading status, no action (a book page is what this row will
//                  eventually open; until then it is deliberately inert)
//   in_catalog  -- the app has it, you don't: Add, which relates it to you with a status
//   not_in_app  -- nobody has it: Import, which puts it in the shared catalog first
//
// Not CatalogRow: that one is off `BookRead`, carries a delete menu, and always means
// "mark as reading". The only thing the two share is a cover-led layout.
export function SearchResultRow({ result }: { result: BookSearchResult }) {
  const badge = result.state === 'in_library' ? result.status && STATUS_LABEL[result.status] : null;

  return (
    <ComboboxItem value={result} className="gap-3 pr-3">
      <CoverImage src={result.cover_url} title={result.title} className="h-16 w-11" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium leading-tight">{result.title}</span>
        <p className="truncate text-sm text-muted-foreground">{result.authors.join(', ')}</p>
        {badge && <Badge className="mt-0.5">{badge}</Badge>}
        {result.state === 'in_catalog' && (
          <Badge variant="outline" className="mt-0.5">
            In catalog
          </Badge>
        )}
      </div>

      {result.state === 'not_in_app' && (
        <Button variant="outline" size="sm" aria-label={`Import ${result.title}`}>
          Import
        </Button>
      )}

      {result.state === 'in_catalog' && (
        <Button size="sm" aria-label={`Add ${result.title} to your library`}>
          Add
        </Button>
      )}
    </ComboboxItem>
  );
}
