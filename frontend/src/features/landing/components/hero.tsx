import { GoogleIcon } from '@/components/common/google-icon';
import { Button } from '@/components/ui/button';
import { login } from '@/lib/auth';

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-10 sm:px-8 md:grid-cols-2 md:py-14">
      <div className="flex flex-col items-start">
        <p className="mb-5 inline-flex items-center gap-2 rounded-4xl bg-tint-1 px-3.5 py-1.5 text-xs font-bold text-brand-pink">
          <span aria-hidden className="size-1.5 rounded-full bg-brand-pink" />
          Early build, live today — the vision below is what&apos;s next
        </p>
        <h1 className="mb-5 font-heading text-4xl leading-tight font-semibold tracking-tight text-balance md:text-6xl">
          Your reading, tracked <em className="text-brand-pink">your way.</em>
        </h1>
        <p className="mb-8 max-w-md font-reading text-base leading-relaxed text-muted-foreground md:text-lg">
          A reading tracker in progress: log in today for basic tracking, and see below for what is
          coming next.
        </p>
        <Button size="lg" onClick={login}>
          <GoogleIcon />
          Continue with Google
        </Button>
      </div>

      <div className="relative flex justify-center pb-12 md:items-start md:pt-2 md:pb-14">
        <div
          aria-hidden
          className="absolute -top-5 left-1/2 size-70 -translate-x-1/2 bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-orange)_22%,transparent),transparent_70%)] blur-sm md:-top-10 md:-right-5 md:left-auto md:size-105 md:translate-x-0"
        />
        {/* The screenshots are opaque PNGs with the device frame drawn inside a light
            margin, so the radius has to hug that frame -- anything smaller leaves the
            margin's square corners showing. */}
        <img
          src="/landing/home-dark.png"
          alt="Rainbow Sam Reads home screen concept, dark mode"
          width={1152}
          height={2622}
          className="relative z-10 w-55 animate-floaty rounded-[34px] shadow-2xl motion-reduce:animate-none md:w-72"
        />
        <img
          src="/landing/insights-light.png"
          alt="Rainbow Sam Reads insights screen concept, light mode"
          width={1152}
          height={1968}
          className="absolute bottom-0 left-0 z-20 w-42 max-w-[38%] animate-floaty rounded-[28px] shadow-xl [animation-delay:0.4s] [animation-duration:7s] motion-reduce:animate-none md:w-58"
        />
        <div className="absolute right-1.5 bottom-0 z-30 rounded-4xl bg-foreground px-2.5 py-1 text-xs font-semibold tracking-wide text-background shadow-md">
          Design concept
        </div>
      </div>
    </section>
  );
}
