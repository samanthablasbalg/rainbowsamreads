import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatIsoDate } from '@/utils/format-date';
import { localIsoDate } from '@/utils/local-date';
import { EditableValue, InlineEditor } from './inline-edit';

type InlineDateEditProps = {
  value: string | null;
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
    <EditableValue label={label} disabled={disabled} onEdit={() => setEditing(true)}>
      {value ? formatIsoDate(value) : '—'}
    </EditableValue>
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
    <InlineEditor label={label} onSave={save} onCancel={onCancel}>
      <Input
        type="date"
        autoFocus
        className="h-8 w-auto"
        max={localIsoDate()}
        aria-label={label}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
    </InlineEditor>
  );
}
