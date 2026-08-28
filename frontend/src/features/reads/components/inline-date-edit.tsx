import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useIsCoarsePointer } from '@/hooks/use-is-coarse-pointer';
import { formatIsoDate } from '@/utils/format-date';
import { localIsoDate } from '@/utils/local-date';
import { EditableValue, InlineEditor } from './inline-edit';

type InlineDateEditProps = {
  value: string | null;
  label: string;
  onSave: (value: string) => Promise<unknown>;
};

export function InlineDateEdit({ value, label, onSave }: InlineDateEditProps) {
  const coarsePointer = useIsCoarsePointer();
  const [editing, setEditing] = useState(false);

  // A date input has to receive the touch itself for the browser to open its picker in
  // the same user gesture. On touch devices it therefore sits transparently over the
  // formatted value, rather than first swapping that value for an editor.
  if (coarsePointer) {
    return <TouchDatePicker value={value} label={label} onSave={onSave} />;
  }

  if (editing) {
    return (
      <DateEditor
        value={value}
        label={label}
        onSave={async (next) => {
          try {
            await onSave(next);
            setEditing(false);
          } catch {
            // The read shows the reason; the editor keeps what was typed so a date the
            // server refused can be adjusted rather than retyped from the old one.
          }
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <EditableValue label={label} onEdit={() => setEditing(true)}>
      {value ? formatIsoDate(value) : '—'}
    </EditableValue>
  );
}

function TouchDatePicker({
  value,
  label,
  onSave,
}: {
  value: string | null;
  label: string;
  onSave: (value: string) => Promise<unknown>;
}) {
  const [saving, setSaving] = useState(false);

  async function save(next: string) {
    if (next === '' || saving) return;

    setSaving(true);
    try {
      await onSave(next);
    } catch {
      // The parent shows the reason and the saved value remains displayed. Choosing a
      // different date is simply another tap, without an editor to dismiss first.
    } finally {
      setSaving(false);
    }
  }

  return (
    <span
      className="relative inline-flex cursor-pointer underline decoration-dotted underline-offset-4 hover:decoration-solid focus-within:decoration-solid"
      aria-busy={saving}
    >
      {value ? formatIsoDate(value) : '—'}
      <Input
        type="date"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        max={localIsoDate()}
        aria-label={`Edit ${label}`}
        value={value ?? ''}
        disabled={saving}
        onChange={(event) => void save(event.target.value)}
      />
    </span>
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
