// The nav shell is being built before any of the screens it frames, so every
// destination renders this. The only thing these pages prove today is that routing
// reached them; each one is replaced by its real screen in punch list § 5 and § 7.
export function ComingSoon({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>Coming soon.</p>
    </section>
  );
}
