import { HugeiconsIcon } from '@hugeicons/react';
import { Logout01Icon, Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

// The handoff puts the account menu in two shapes -- a dropdown off the rail on
// tablet-landscape and desktop, a bottom sheet on mobile for the bigger touch
// targets. Both offer the same two actions, so the actions live here once and each
// presentation only decides how to render them.
function useAccountActions() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  // A single toggle, per the handoff. Note this can only ever land on an explicit
  // 'light' or 'dark' -- once used, the 'system' setting is no longer reachable
  // from the UI. A settings screen is where that comes back.
  const isDark = resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return { user, logout, isDark, toggleTheme };
}

// CurrentUser carries no display name, so the avatar falls back to the first letter
// of the email and the menu shows the address itself.
function UserAvatar({ email, picture }: { email: string; picture: string | null }) {
  return (
    <Avatar>
      {picture && <AvatarImage src={picture} alt="" />}
      <AvatarFallback>{email.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export function AccountMenuDropdown() {
  const { user, logout, isDark, toggleTheme } = useAccountActions();
  if (!user) return null;

  return (
    <DropdownMenu>
      {/* Base UI's `render` is the equivalent of Radix's `asChild`: the trigger's
          behaviour is merged onto the element given here instead of wrapping it. */}
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-auto w-full justify-start px-2 py-2" />}
      >
        <UserAvatar email={user.email} picture={user.picture} />
        <span className="truncate">{user.email}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={toggleTheme}>
            <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} />
            Toggle theme
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => logout()}>
            <HugeiconsIcon icon={Logout01Icon} />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AccountMenuSheet() {
  const { user, logout, isDark, toggleTheme } = useAccountActions();
  if (!user) return null;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account" />
        }
      >
        <UserAvatar email={user.email} picture={user.picture} />
      </SheetTrigger>

      <SheetContent side="bottom">
        {/* Required for accessibility -- the sheet is named by this even though the
            email doubles as the visible heading. */}
        <SheetHeader>
          <SheetTitle className="truncate">{user.email}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-1 p-4 pt-0">
          <Button variant="ghost" className="justify-start" onClick={toggleTheme}>
            <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} data-icon="inline-start" />
            Toggle theme
          </Button>
          <Button variant="ghost" className="justify-start" onClick={() => logout()}>
            <HugeiconsIcon icon={Logout01Icon} data-icon="inline-start" />
            Log out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
