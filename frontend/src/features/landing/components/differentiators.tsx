import { Badge } from '@/components/ui/badge';

const points = [
  {
    title: 'Switch formats mid-book, re-read on purpose',
    body: 'Most trackers treat a re-listen or a format swap as a new book. Here, one "read" can move between audio, ebook, and print, and re-reading a chapter you already covered logs as time spent without inflating your completion percent.',
    image: '/landing/reread-multiformat-v2.png',
    width: 1080,
    height: 2097,
    alt: 'Reading log showing alternating audio and print sessions, with a re-read percentage tracked separately from new progress',
  },
  {
    title: 'Anthologies and omnibuses, story by story',
    body: 'Read one short story from a collection, or one issue from an omnibus, out of order, without tracking the whole book or wrecking your percent complete. Contents are delineated, so progress is always the truth.',
    image: '/landing/anthology-contents-v2.png',
    width: 1080,
    height: 1566,
    alt: 'Contents list for a comics omnibus, grouped by story arc with independent per-issue progress',
  },
];

// The two screenshots have different aspect ratios, so they are sized by height: matching
// on width instead makes the taller one tower over its neighbour.
export function Differentiators() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-6 pb-2 sm:px-8">
      <p className="mb-3 text-center text-xs font-bold tracking-widest text-brand-orange uppercase">
        What sets it apart
      </p>
      <h2 className="mx-auto mb-8 max-w-2xl text-center font-heading text-2xl font-semibold tracking-tight text-balance md:mb-12 md:text-4xl">
        Two problems most trackers ignore
      </h2>

      <div className="grid gap-5 md:grid-cols-2 md:gap-7">
        {points.map((point) => (
          <article
            key={point.title}
            className="rounded-3xl border border-border bg-card p-6 md:p-8"
          >
            <Badge className="bg-tint-1 tracking-wider text-brand-pink uppercase">
              Designed · in progress
            </Badge>
            <h3 className="mt-3 mb-2.5 font-heading text-xl font-semibold">{point.title}</h3>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{point.body}</p>
            <img
              src={point.image}
              alt={point.alt}
              width={point.width}
              height={point.height}
              className="mx-auto block h-80 w-auto max-w-full rounded-3xl shadow-xl md:h-100"
            />
          </article>
        ))}
      </div>
    </section>
  );
}
