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

function useAccountActions() {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return { user, logout, isDark, toggleTheme };
}

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
