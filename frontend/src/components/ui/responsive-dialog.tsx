import * as React from 'react';

import { useIsCoarsePointer } from '@/hooks/use-is-coarse-pointer';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

// One overlay that renders as a centred dialog under a fine pointer and a bottom drawer
// under a coarse one, so a screen writes a single tree instead of forking. Every class
// here comes from dialog.tsx and drawer.tsx untouched -- this file styles nothing, it
// only chooses which family's part to render.
//
// The pointer is read once, at the root, and shared through context rather than each
// part calling useIsCoarsePointer() for itself. A resize between two parts' renders
// would otherwise let them disagree, and a DialogTitle inside a DrawerPopup is not just
// cosmetic -- the title is what names the popup for assistive tech, and the association
// is per-family.
const CoarseContext = React.createContext<boolean | null>(null);

function useCoarse() {
  const coarse = React.useContext(CoarseContext);

  if (coarse === null) {
    throw new Error('ResponsiveDialog parts must be used within a ResponsiveDialog.');
  }

  return coarse;
}

// Props come from the Drawer side throughout, and that direction is load-bearing rather
// than arbitrary. Drawer's close reasons are Dialog's plus 'swipe' and 'close-watcher',
// and a callback typed for the smaller set cannot be handed to the branch that emits the
// larger one -- Dialog's props spread into Drawer is a compile error, the reverse is not.
// Typing from Drawer keeps the whole Base UI surface: `reason`, `cancel()`, `event`,
// `preventUnmountOnClose()`. Drawer-only props land on Dialog.Root under a fine pointer,
// which renders no DOM element of its own, so they are inert there rather than wrong.
function ResponsiveDialog({ children, ...props }: React.ComponentProps<typeof Drawer>) {
  const coarse = useIsCoarsePointer();

  return (
    <CoarseContext value={coarse}>
      {coarse ? <Drawer {...props}>{children}</Drawer> : <Dialog {...props}>{children}</Dialog>}
    </CoarseContext>
  );
}

function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DrawerTrigger>) {
  return useCoarse() ? <DrawerTrigger {...props} /> : <DialogTrigger {...props} />;
}

// Both families' Content render their own portal and backdrop, so this is a straight
// swap. It is also the mount boundary that matters: children of this part live inside a
// portal that defaults to keepMounted={false}, so they unmount once a close finishes.
// Put a form's state in a component rendered *here* and it resets itself between opens.
// State hoisted above this line belongs to a component that never unmounts, and will
// survive every close -- that is a bug this layer cannot prevent for you.
//
// Popup is the one part where the families genuinely diverge, on three props that each
// take a plain value or a function of the part's own state. Only the function form is
// per-family: DrawerPopupState carries `expanded`, `swiping` and the nested-drawer flags
// DialogPopupState has no equivalent for, so a function written against either cannot be
// handed to the other branch. The plain forms cross fine and are what this repo uses --
// every `render` here is the element form -- and the same state is on the element as
// `data-*`, which is how drawer.tsx styles it anyway.
type ResponsiveDialogContentProps = Omit<
  React.ComponentProps<typeof DrawerContent>,
  'className' | 'style' | 'render'
> & {
  className?: string;
  style?: React.CSSProperties;
  render?: React.ReactElement;
};

function ResponsiveDialogContent(props: ResponsiveDialogContentProps) {
  return useCoarse() ? <DrawerContent {...props} /> : <DialogContent {...props} />;
}

function ResponsiveDialogHeader(props: React.ComponentProps<'div'>) {
  return useCoarse() ? <DrawerHeader {...props} /> : <DialogHeader {...props} />;
}

function ResponsiveDialogFooter(props: React.ComponentProps<'div'>) {
  return useCoarse() ? <DrawerFooter {...props} /> : <DialogFooter {...props} />;
}

function ResponsiveDialogTitle(props: React.ComponentProps<typeof DrawerTitle>) {
  return useCoarse() ? <DrawerTitle {...props} /> : <DialogTitle {...props} />;
}

function ResponsiveDialogDescription(props: React.ComponentProps<typeof DrawerDescription>) {
  return useCoarse() ? <DrawerDescription {...props} /> : <DialogDescription {...props} />;
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DrawerClose>) {
  return useCoarse() ? <DrawerClose {...props} /> : <DialogClose {...props} />;
}

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
};
