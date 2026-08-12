import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

// The confirmation body every destructive or consequential action shares. Owned by the
// caller: it holds `open`, and `onConfirm` runs the mutation directly. There is no
// promise and no context -- a row that wants a confirmation renders one of these next to
// the thing being confirmed.
//
// `disablePointerDismissal` keeps a stray backdrop press from counting as an answer.
// Cancel, the corner close and Escape all close through `onOpenChange`, which is the
// caller's "no".
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  // `danger` is reserved for actions that destroy data -- [[0031]]. Consequential-but-
  // recoverable actions (finish, DNF) don't get it; spending the warning colour on those
  // is what makes it stop reading as a warning when it matters.
  tone?: 'default' | 'danger';
  onConfirm: () => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{description}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose render={<Button variant="outline" />}>
            {cancelLabel}
          </ResponsiveDialogClose>
          <Button variant={tone === 'danger' ? 'destructive' : 'default'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
