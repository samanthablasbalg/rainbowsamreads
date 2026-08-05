import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  AlertSheet,
  AlertSheetAction,
  AlertSheetCancel,
  AlertSheetContent,
  AlertSheetDescription,
  AlertSheetFooter,
  AlertSheetHeader,
  AlertSheetTitle,
} from '@/components/ui/alert-sheet';
import { useIsCoarsePointer } from '@/hooks/use-is-coarse-pointer';
import { ConfirmContext, type ConfirmOptions } from './confirm-context';

type PendingConfirm = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

type HostProps = {
  pending: PendingConfirm | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const isCoarsePointer = useIsCoarsePointer();
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  // The promise doesn't resolve here -- it resolves later, from whichever button the
  // rendered host below actually gets clicked.
  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  // Covers Cancel and Escape. Backdrop click doesn't reach this at all -- disabled at
  // the primitive, not handled here -- so it isn't "no", it's nothing.
  function handleOpenChange(open: boolean) {
    if (!open && pending) {
      pending.resolve(false);
      setPending(null);
    }
  }

  function handleConfirm() {
    if (!pending) return;
    pending.resolve(true);
    setPending(null);
  }

  return (
    <ConfirmContext value={confirm}>
      {children}

      {isCoarsePointer ? (
        <ConfirmSheetHost
          pending={pending}
          onOpenChange={handleOpenChange}
          onConfirm={handleConfirm}
        />
      ) : (
        <ConfirmDialogHost
          pending={pending}
          onOpenChange={handleOpenChange}
          onConfirm={handleConfirm}
        />
      )}
    </ConfirmContext>
  );
}

// Always rendered while `!isCoarsePointer` -- `pending` controls `open`, not whether
// this component exists. Unmounting it the instant `pending` clears would skip the
// close animation.
function ConfirmDialogHost({ pending, onOpenChange, onConfirm }: HostProps) {
  const {
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'default',
  } = pending ?? {};

  return (
    <AlertDialog open={pending !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={tone === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmSheetHost({ pending, onOpenChange, onConfirm }: HostProps) {
  const {
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'default',
  } = pending ?? {};

  return (
    <AlertSheet open={pending !== null} onOpenChange={onOpenChange}>
      <AlertSheetContent side="bottom">
        <AlertSheetHeader>
          <AlertSheetTitle>{title}</AlertSheetTitle>
          <AlertSheetDescription>{description}</AlertSheetDescription>
        </AlertSheetHeader>
        <AlertSheetFooter>
          <AlertSheetCancel>{cancelLabel}</AlertSheetCancel>
          <AlertSheetAction
            variant={tone === 'danger' ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertSheetAction>
        </AlertSheetFooter>
      </AlertSheetContent>
    </AlertSheet>
  );
}
