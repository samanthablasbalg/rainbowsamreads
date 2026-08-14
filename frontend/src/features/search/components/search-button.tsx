import type * as React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';

export function SearchButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="outline" size="icon" aria-label="Search books" {...props}>
      <HugeiconsIcon icon={Search01Icon} />
    </Button>
  );
}
