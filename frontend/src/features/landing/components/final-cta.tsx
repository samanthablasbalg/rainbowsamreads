import { GoogleIcon } from '@/components/common/google-icon';
import { Button } from '@/components/ui/button';
import { login } from '@/lib/auth';

export function FinalCta() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-20 text-center md:py-28">
      <h2 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
        Start your shelf today
      </h2>
      <p className="text-base text-muted-foreground">
        One Google login. No setup, no busywork — just your books.
      </p>
      <Button size="lg" onClick={login}>
        <GoogleIcon />
        Continue with Google
      </Button>
    </section>
  );
}
