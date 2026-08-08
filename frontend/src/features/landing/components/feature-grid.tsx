import { BarChartIcon, Book02Icon, FireIcon, Target02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

const features = [
  {
    title: 'Currently reading',
    body: 'Live today: add books to your library, three formats, one place to log progress.',
    icon: Book02Icon,
    className: 'bg-tint-1 text-brand-pink',
  },
  {
    title: 'Streaks',
    body: 'In progress: daily reading streaks with your longest-ever record on hand.',
    icon: FireIcon,
    className: 'bg-tint-4 text-brand-orange',
  },
  {
    title: 'Insights',
    body: 'Designed, building next: genres, formats, and pages read per month, charted.',
    icon: BarChartIcon,
    className: 'bg-tint-2 text-category-3',
  },
  {
    title: 'Challenges',
    body: 'On the roadmap: set yearly goals and build personalized lists, watch them fill in as you read.',
    icon: Target02Icon,
    className: 'bg-tint-3 text-category-4',
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 md:py-16">
      <h2 className="text-center font-heading text-2xl font-semibold tracking-tight text-balance md:text-4xl">
        Everything a shelf should track
      </h2>
      <p className="mx-auto mt-3 mb-8 max-w-2xl text-center text-sm text-muted-foreground md:mb-12 md:text-base">
        The roadmap: progress tracking for current reads is live now. Library organization, stats,
        and more are coming next.
      </p>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4 md:gap-5">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-border bg-card px-4 py-5 md:px-5 md:py-6"
          >
            <div
              className={`mb-4 flex size-11 items-center justify-center rounded-xl ${feature.className}`}
            >
              <HugeiconsIcon icon={feature.icon} size={20} />
            </div>
            <h3 className="mb-2 font-heading text-base font-semibold md:text-lg">
              {feature.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
