export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 sm:flex-row">
        <span className="font-heading font-semibold">Rainbow Sam Reads</span>
        <span className="text-sm text-muted-foreground">
          Designed &amp; built independently · {new Date().getFullYear()}
        </span>
      </div>
    </footer>
  );
}
