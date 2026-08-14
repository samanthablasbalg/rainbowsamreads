import type { BookSearchResult } from '@/api/generated/readingTracker.schemas';
import { CoverImage } from '@/components/common/cover-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComboboxItem } from '@/components/ui/combobox';
import { STATUSES } from '@/utils/status';

type SearchResultRowProps = {
  result: BookSearchResult;
  importing: boolean;
  onAdd: () => void;
  onImport: () => void;
};

export function SearchResultRow({ result, importing, onAdd, onImport }: SearchResultRowProps) {
  const badge =
    result.state === 'in_library' ? result.status && STATUSES[result.status].label : null;

  return (
    <ComboboxItem value={result} className="gap-3 pr-3">
      <CoverImage src={result.cover_url} title={result.title} className="h-16 w-11" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* `truncate`, unlike the shelf rows: a wrapping title would make rows change
            height as you arrow through results. */}
        <span className="truncate font-heading text-base font-medium leading-tight">
          {result.title}
        </span>
        <p className="truncate text-sm text-muted-foreground">{result.authors.join(', ')}</p>
        {badge && <Badge className="mt-0.5">{badge}</Badge>}
        {result.state === 'in_catalog' && (
          <Badge variant="outline" className="mt-0.5">
            In catalog
          </Badge>
        )}
      </div>

      {result.state === 'not_in_app' && (
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          aria-label={`Import ${result.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onImport();
          }}
        >
          {importing ? 'Importing…' : 'Import'}
        </Button>
      )}

      {result.state === 'in_catalog' && (
        <Button
          size="sm"
          aria-label={`Add ${result.title} to your library`}
          onClick={(event) => {
            event.stopPropagation();
            onAdd();
          }}
        >
          Add
        </Button>
      )}
    </ComboboxItem>
  );
}
