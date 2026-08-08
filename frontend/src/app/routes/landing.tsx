import { Button } from '@/components/ui/button';
import { login } from '@/lib/auth';

// The public front door. Signed out, this is what `/` shows; RequireGuest redirects
// away from here to /home as soon as there is a session.
export function Landing() {
  return (
    <section>
      <h1>Rainbow Sam Reads</h1>
      <p>Coming soon.</p>
      <Button onClick={login}>Sign in with Google</Button>
    </section>
  );
}
