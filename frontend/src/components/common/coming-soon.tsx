// Stands in for a destination whose screen does not exist yet, so the nav can reach it.
export function ComingSoon({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>Coming soon.</p>
    </section>
  );
}
