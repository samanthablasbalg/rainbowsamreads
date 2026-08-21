import * as React from 'react';

import { useIsCoarsePointer } from '@/hooks/use-is-coarse-pointer';
import {
  Dialog,
  DialogBody,
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
  DrawerBody,
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
const CoarseContext = React.createContext<boolean | null>(null);

function useCoarse() {
  const coarse = React.useContext(CoarseContext);

  if (coarse === null) {
    throw new Error('ResponsiveDialog parts must be used within a ResponsiveDialog.');
  }

  return coarse;
}

// Props are typed from the Drawer side throughout, and the direction is load-bearing:
// Drawer's close reasons are Dialog's plus 'swipe' and 'close-watcher', so Dialog's props
// spread into Drawer is a compile error while the reverse is not.
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

// The mount boundary: children of this part live inside a portal that defaults to
// keepMounted={false}, so they unmount once a close finishes. A form's state rendered
// *here* resets between opens; hoisted above this line it survives every close.
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

function ResponsiveDialogBody(props: React.ComponentProps<'div'>) {
  return useCoarse() ? <DrawerBody {...props} /> : <DialogBody {...props} />;
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
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
};
