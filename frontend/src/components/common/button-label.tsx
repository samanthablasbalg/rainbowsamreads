import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon } from '@hugeicons/core-free-icons';

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
