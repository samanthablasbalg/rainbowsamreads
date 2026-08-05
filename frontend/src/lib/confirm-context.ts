import { createContext, useContext } from 'react';

export type ConfirmTone = 'default' | 'danger';

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // Reserved for actions that destroy data -- [[0031]]. Consequential-but-recoverable
  // actions (finish, DNF) don't get it; spending the warning colour on those is what
  // makes it stop reading as a warning when it matters.
  tone?: ConfirmTone;
};

// The context value is the function itself, not `{ confirm }` -- there's exactly one
// thing a caller needs, so a wrapper object would just be a layer to unwrap again at
// every call site.
export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<Confirm | undefined>(undefined);

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (confirm === undefined) {
    throw new Error('useConfirm must be called inside a ConfirmProvider');
  }
  return confirm;
}
