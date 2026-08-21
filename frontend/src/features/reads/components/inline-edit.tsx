import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EditableValueProps = {
  // Lowercase: "start date" gives "Edit start date" / "Save start date".
  label: string;
  disabled?: boolean;
  onEdit: () => void;
  children: ReactNode;
};

// Dotted-underlined so the value reads as editable at rest; a disabled one carries no
// underline, because there is nothing to open.
export function EditableValue({ label, disabled = false, onEdit, children }: EditableValueProps) {
  return (
    <Button
      variant="link"
      className={cn(
        'h-auto p-0 font-normal text-inherit underline decoration-dotted underline-offset-4 hover:decoration-solid',
        disabled && 'no-underline'
      )}
      disabled={disabled}
      aria-label={`Edit ${label}`}
      onClick={onEdit}
    >
      {children}
    </Button>
  );
}

type InlineEditorProps = {
  label: string;
  // Shown beside the controls rather than as a block: the whole editor sits inline in a
  // line of metadata, so ErrorText's paragraph can't nest here.
  error?: string | null;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
};

// Enter and Escape are handled here rather than on each input, since they bubble out of
// whichever control the caller puts in.
export function InlineEditor({ label, error, onSave, onCancel, children }: InlineEditorProps) {
  return (
    <span
      className="inline-flex items-center gap-1"
      onKeyDown={(event) => {
        if (event.key === 'Enter') onSave();
        if (event.key === 'Escape') onCancel();
      }}
    >
      {children}
      <Button variant="ghost" size="icon-sm" aria-label={`Save ${label}`} onClick={onSave}>
        <HugeiconsIcon icon={Tick02Icon} />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Cancel ${label} edit`} onClick={onCancel}>
        <HugeiconsIcon icon={Cancel01Icon} />
      </Button>
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
