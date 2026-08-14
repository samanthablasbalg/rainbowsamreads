import { GoogleIcon } from '@/components/common/google-icon';
import { Button } from '@/components/ui/button';
import { login } from '@/lib/auth';

export function LandingNav() {
  return (
    <nav
      aria-label="Landing"
      className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8 sm:py-5"
    >
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden
          className="size-8 shrink-0 rounded-lg bg-linear-[135deg] from-brand-orange to-brand-pink"
        />
        <span className="font-heading text-sm font-semibold tracking-tight whitespace-nowrap sm:text-lg">
          Rainbow Sam Reads
        </span>
      </div>
      {/* The wordmark and this label are both whitespace-nowrap and together overflow a
          narrow phone, so the label sheds "with Google" rather than the wordmark
          breaking across two lines. */}
      <Button variant="outline" onClick={login}>
        <GoogleIcon />
        Log in<span className="hidden sm:inline"> with Google</span>
      </Button>
    </nav>
  );
}
