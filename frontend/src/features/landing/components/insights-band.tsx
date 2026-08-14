// Dark by design, not by theme: the `dark` class re-declares the palette tokens for this
// subtree, so it stays dark whatever the rest of the page is doing.
export function InsightsBand() {
  return (
    <section className="dark mt-14 bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-5 py-14 sm:px-8 md:grid-cols-2 md:gap-14 md:py-20">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Insights · Coming next
          </p>
          <h2 className="mt-2 mb-4 font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            A year in reading, visualized
          </h2>
          <p className="max-w-md font-reading text-base leading-relaxed text-muted-foreground md:text-lg">
            Genres, formats, your reading over time, even personal tags for the diversity of your
            shelf and who recommended a book to you.
          </p>
        </div>
        <div className="flex justify-center">
          <img
            src="/landing/insights-dark.png"
            alt="Insights screen, dark mode, showing stat tiles, a pages-read-per-month chart, and a genre breakdown"
            width={1152}
            height={2622}
            className="w-70 max-w-full rounded-[32px] shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
}
