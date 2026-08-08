import { HugeiconsIcon } from '@hugeicons/react';
import { Book02Icon } from '@hugeicons/core-free-icons';
import { useEngagementsListEngagements } from '@/api/generated/engagements/engagements';
import type { ReadingStatus } from '@/api/generated/readingTracker.schemas';
import { Pending } from '@/components/common/pending';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { EngagementRow } from './engagement-row';

// Both engagement shelves, one component. Finished and DNF differ in the status they
// ask for and the words on their empty state -- everything else, including the row, is
// the same, so the difference is passed in rather than duplicated into two files.
//
// `status` is required by the API and takes exactly one value, so there is no "all
// engagements" call to make here. Ordering is the backend's (finished by finished_on,
// dnf by abandoned_on); this renders what it returns.
export function EngagementShelf({
  status,
  heading,
  emptyTitle,
  emptyDescription,
}: {
  status: ReadingStatus;
  heading: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const { data: engagements, isPending, isError } = useEngagementsListEngagements({ status });

  return (
    <section>
      {/* sr-only for the same reason as the catalog: the shelf nav names this visually,
          but the heading outline is a separate way to navigate. */}
      <h1 className="sr-only">{heading}</h1>

      {isPending && <Pending />}
      {isError && <p role="alert">Couldn&apos;t load your books. Try reloading the page.</p>}

      {engagements && engagements.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Book02Icon} />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {engagements && engagements.length > 0 && (
        <ul className="flex flex-col gap-3">
          {engagements.map((engagement) => (
            <EngagementRow key={engagement.id} engagement={engagement} />
          ))}
        </ul>
      )}
    </section>
  );
}
