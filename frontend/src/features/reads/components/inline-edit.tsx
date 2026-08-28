import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';

type EditableValueProps = {
  // Lowercase: "start date" gives "Edit start date" / "Save start date".
  label: string;
  onEdit: () => void;
  children: ReactNode;
};

export function EditableValue({ label, onEdit, children }: EditableValueProps) {
  return (
    <Button
      variant="link"
      className="h-auto p-0 font-normal text-inherit underline decoration-dotted underline-offset-4 hover:decoration-solid"
      aria-label={`Edit ${label}`}
      onClick={onEdit}
    >
      {children}
    </Button>
  );
}

type InlineEditorProps = {
  label: string;
  error?: string | null;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
};

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
