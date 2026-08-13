import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon } from '@hugeicons/core-free-icons';

// Swaps a button's label for a spinner + verb-ing text while its own mutation is in
// flight, so a disabled button reads as "working" rather than just inert. `data-icon`
// is the same slot the Button component's own icon buttons key their padding off of
// (see streak-indicator.tsx, account-menu.tsx).
//
// A fragment rather than an element: it is the Button's children, and Button lays its
// own icon and text out.
export function ButtonLabel({
  pending,
  pendingLabel,
  children,
}: {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  if (!pending) return <>{children}</>;
  return (
    <>
      <HugeiconsIcon icon={Loading03Icon} className="animate-spin" data-icon="inline-start" />
      {pendingLabel}
    </>
  );
}
