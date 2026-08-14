import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatIsoDate } from '@/utils/format-date';
import { localIsoDate } from '@/utils/local-date';

type InlineDateEditProps = {
  value: string | null;
  // Lowercase: "start date" gives "Edit start date" / "Save start date".
  label: string;
  disabled?: boolean;
  onSave: (value: string) => void;
};

export function InlineDateEdit({ value, label, disabled = false, onSave }: InlineDateEditProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <DateEditor
        value={value}
        label={label}
        onSave={(next) => {
          setEditing(false);
          onSave(next);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Button
      variant="link"
      className="h-auto p-0 font-normal text-inherit"
      disabled={disabled}
      aria-label={`Edit ${label}`}
      onClick={() => setEditing(true)}
    >
      {value ? formatIsoDate(value) : '—'}
    </Button>
  );
}

function DateEditor({
  value,
  label,
  onSave,
  onCancel,
}: {
  value: string | null;
  label: string;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value ?? '');

  function save() {
    if (draft === '') return onCancel();
    onSave(draft);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        type="date"
        autoFocus
        className="h-8 w-auto"
        max={localIsoDate()}
        aria-label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') save();
          if (event.key === 'Escape') onCancel();
        }}
      />
      <Button variant="ghost" size="icon-sm" aria-label={`Save ${label}`} onClick={save}>
        <HugeiconsIcon icon={Tick02Icon} />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Cancel ${label} edit`} onClick={onCancel}>
        <HugeiconsIcon icon={Cancel01Icon} />
      </Button>
    </span>
  );
}
