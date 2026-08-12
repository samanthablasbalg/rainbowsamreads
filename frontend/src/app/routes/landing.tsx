import { Differentiators } from '@/features/landing/components/differentiators';
import { FeatureGrid } from '@/features/landing/components/feature-grid';
import { FinalCta } from '@/features/landing/components/final-cta';
import { Hero } from '@/features/landing/components/hero';
import { InsightsBand } from '@/features/landing/components/insights-band';
import { LandingFooter } from '@/features/landing/components/landing-footer';
import { LandingNav } from '@/features/landing/components/landing-nav';
import { Trust } from '@/features/landing/components/trust';

// The public front door. Signed out, this is what `/` shows; RequireGuest redirects
// away from here to /home as soon as there is a session. It brings its own nav and
// footer -- AuthenticatedShell sits on the other side of the guard.
//
// Pinned light: this page is one composition, and it was designed against the light
// palette with InsightsBand as the single dark strip in it. The reader's theme takes
// over past the guard, where it is their app rather than a front page.
export function Landing() {
  return (
    <div className="light bg-background text-foreground">
      <LandingNav />
      <Hero />
      <Trust />
      <Differentiators />
      <FeatureGrid />
      <InsightsBand />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
