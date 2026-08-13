import type { ReactNode } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Book02Icon } from '@hugeicons/core-free-icons';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

// The empty twin of ErrorState: same Empty primitives, same silhouette, so a shelf with
// nothing on it reads as part of the app rather than as a screen that failed to render.
// The two are meant to stay in step, which is the reason this is a component and not five
// primitives at each call site.
//
// The icon defaults to a book because most empty states here are a shelf with no books on
// it; a screen listing something else passes its own.
//
// `action` is a slot rather than a baked-in button for the same reason as ErrorState's:
// the verb belongs to the caller, and most empty states have no action at all.
export function EmptyState({
  icon = Book02Icon,
  title,
  description,
  action,
}: {
  icon?: IconSvgElement;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={icon} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
