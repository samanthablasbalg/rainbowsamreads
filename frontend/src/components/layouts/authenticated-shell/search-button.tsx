import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';

// Deliberately inert. Punch list section 7 ports the search panel and gives this an
// onClick; until then the shell needs the button to exist and hold its space.
//
// The handoff asks for a ghost button in the mobile/portrait header and an outline
// one in the tablet/desktop top bar, so the variant is the caller's choice.
export function SearchButton({ variant = 'ghost' }: { variant?: 'ghost' | 'outline' }) {
  return (
    <Button variant={variant} size="icon" aria-label="Search">
      <HugeiconsIcon icon={Search01Icon} />
    </Button>
  );
}
