import * as React from 'react';
import { AlertDialog as AlertSheetPrimitive } from '@base-ui/react/alert-dialog';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Sheet's positioning and slide styling, alert-dialog.tsx's part shape (Action/Cancel
// split, no corner close) -- Base UI has no alert-flavored drawer to install, so this
// is the one primitive in this layer that isn't a straight `shadcn add`. It exists for
// the same reason alert-dialog.tsx does: a destructive confirmation shouldn't close on
// a stray backdrop tap, and that guarantee is Root's, not Popup's, so a hand-built
// Root on top of `AlertDialog` inherits it for free.
function AlertSheet({ ...props }: AlertSheetPrimitive.Root.Props) {
  return <AlertSheetPrimitive.Root data-slot="alert-sheet" {...props} />;
}

function AlertSheetTrigger({ ...props }: AlertSheetPrimitive.Trigger.Props) {
  return <AlertSheetPrimitive.Trigger data-slot="alert-sheet-trigger" {...props} />;
}

function AlertSheetPortal({ ...props }: AlertSheetPrimitive.Portal.Props) {
  return <AlertSheetPrimitive.Portal data-slot="alert-sheet-portal" {...props} />;
}

function AlertSheetOverlay({ className, ...props }: AlertSheetPrimitive.Backdrop.Props) {
  return (
    <AlertSheetPrimitive.Backdrop
      data-slot="alert-sheet-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/80 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs',
        className
      )}
      {...props}
    />
  );
}

function AlertSheetContent({
  className,
  side = 'bottom',
  ...props
}: AlertSheetPrimitive.Popup.Props & {
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <AlertSheetPortal>
      <AlertSheetOverlay />
      <AlertSheetPrimitive.Popup
        data-slot="alert-sheet-content"
        data-side={side}
        className={cn(
          'fixed z-50 flex flex-col bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-10 data-[side=bottom]:data-starting-style:translate-y-10 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
          className
        )}
        {...props}
      />
    </AlertSheetPortal>
  );
}

function AlertSheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-sheet-header"
      className={cn('flex flex-col gap-1.5 p-6', className)}
      {...props}
    />
  );
}

function AlertSheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-sheet-footer"
      className={cn('mt-auto flex flex-col-reverse gap-2 p-6', className)}
      {...props}
    />
  );
}

function AlertSheetMedia({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-sheet-media"
      className={cn(
        "mb-2 inline-flex size-16 items-center justify-center rounded-full bg-muted *:[svg:not([class*='size-'])]:size-8",
        className
      )}
      {...props}
    />
  );
}

function AlertSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertSheetPrimitive.Title>) {
  return (
    <AlertSheetPrimitive.Title
      data-slot="alert-sheet-title"
      className={cn('text-base font-medium text-foreground', className)}
      {...props}
    />
  );
}

function AlertSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertSheetPrimitive.Description>) {
  return (
    <AlertSheetPrimitive.Description
      data-slot="alert-sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function AlertSheetAction({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-sheet-action" className={cn(className)} {...props} />;
}

function AlertSheetCancel({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: AlertSheetPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <AlertSheetPrimitive.Close
      data-slot="alert-sheet-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

export {
  AlertSheet,
  AlertSheetAction,
  AlertSheetCancel,
  AlertSheetContent,
  AlertSheetDescription,
  AlertSheetFooter,
  AlertSheetHeader,
  AlertSheetMedia,
  AlertSheetOverlay,
  AlertSheetPortal,
  AlertSheetTitle,
  AlertSheetTrigger,
};
