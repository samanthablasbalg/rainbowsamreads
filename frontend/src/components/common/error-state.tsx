import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon } from '@hugeicons/core-free-icons';
import { isAxiosError } from 'axios';
import { isRouteErrorResponse } from 'react-router';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

// Vite's `import()` rejects with a plain TypeError whose message differs per browser,
// so this matches on text rather than a type. It is worth its own bucket twice over:
// in dev it means a module that failed to compile, and in production it means a chunk
// whose hash stopped existing because the app was redeployed while the tab was open.
// Both are fixed by reloading, which no other error here is.
function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return /dynamically imported module|module script failed/i.test(message);
}

// Turns whatever was thrown into copy a reader can act on. Ordered most specific
// first: a failed chunk import is a bare TypeError, so the generic fallback would
// claim it if it ran first.
//
// Private: exporting it alongside a component breaks Fast Refresh, and ErrorState is
// its only caller. Its branches get covered through the component.
function describeError(error: unknown): { title: string; description: string } {
  if (isChunkLoadError(error)) {
    return {
      title: 'The app was updated',
      description: 'Reload the page to pick up the latest version.',
    };
  }

  // Two shapes carry a status: a Response thrown by a loader, and an axios rejection.
  const status = isRouteErrorResponse(error)
    ? error.status
    : isAxiosError(error)
      ? error.response?.status
      : undefined;

  // An axios error with no response never reached the server at all.
  if (isAxiosError(error) && status === undefined) {
    return {
      title: "Can't reach the server",
      description: 'Check your connection, then try again.',
    };
  }

  if (status === 404) {
    return { title: "We couldn't find that", description: 'It may have been deleted.' };
  }

  if (status === 403) {
    return {
      title: "You don't have access to that",
      description: "It belongs to someone else, or it isn't shared with you.",
    };
  }

  if (status !== undefined && status >= 500) {
    return {
      title: 'Something went wrong on our end',
      description: 'Nothing you did caused this. Try again in a moment.',
    };
  }

  return {
    title: 'Something went wrong',
    description: 'Reloading the page usually clears it.',
  };
}

// The error twin of the empty states: same Empty primitives, same silhouette, so a
// failure reads as part of the app rather than as the app falling over. The media
// tile overrides the primitive's neutral `bg-muted` with destructive, which is the
// one thing that distinguishes it at a glance from the empty state beside it.
//
// `action` is a slot rather than a baked-in button because callers want different
// verbs: a query passes Retry wired to `refetch`, the route boundary passes Reload.
export function ErrorState({ error, action }: { error: unknown; action?: ReactNode }) {
  const { title, description } = describeError(error);

  return (
    <Empty role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <HugeiconsIcon icon={Alert02Icon} />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
