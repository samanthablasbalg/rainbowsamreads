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

function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return /dynamically imported module|module script failed/i.test(message);
}

function describeError(error: unknown): { title: string; description: string } {
  if (isChunkLoadError(error)) {
    return {
      title: 'The app was updated',
      description: 'Reload the page to pick up the latest version.',
    };
  }

  const status = isRouteErrorResponse(error)
    ? error.status
    : isAxiosError(error)
      ? error.response?.status
      : undefined;

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
