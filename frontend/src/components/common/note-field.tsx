import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

type NoteFieldProps = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
};

export function NoteField({
  id,
  value,
  onValueChange,
  disabled,
  defaultOpen = false,
}: NoteFieldProps) {
  const [open, setOpen] = useState(defaultOpen);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasMounted = useRef(false);

  // Only the reveal (a user click transitioning open false -> true) should steal focus --
  // never the initial render, which would otherwise autofocus the textarea in the edit
  // sheet whenever an entry already has a note.
  useEffect(() => {
    if (hasMounted.current && open) {
      textareaRef.current?.focus();
    }
    hasMounted.current = true;
  }, [open]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {!open && (
        <CollapsibleTrigger
          render={<Button variant="ghost" size="sm" className="-ml-3 self-start" />}
        >
          + Add a note
        </CollapsibleTrigger>
      )}
      <CollapsibleContent>
        <Field>
          <FieldLabel htmlFor={id}>Note</FieldLabel>
          <Textarea
            id={id}
            ref={textareaRef}
            value={value}
            disabled={disabled}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </Field>
      </CollapsibleContent>
    </Collapsible>
  );
}
