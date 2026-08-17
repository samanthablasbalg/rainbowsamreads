import { useState } from 'react';
import { cn } from '@/lib/utils';

// Google hands out `zoom=1`, a ~128px thumbnail that visibly blurs anywhere bigger than a
// list row, and `edge=curl` draws a fake page-curl over the artwork. Both are query
// parameters on an image host, so a larger, flat cover is a rewrite rather than a
// re-import -- which also means it fixes every row already in the database.
function sharpen(src: string): string {
  if (!src.includes('books.google.com')) {
    return src;
  }
  const url = new URL(src);
  url.searchParams.set('zoom', '3');
  url.searchParams.delete('edge');
  return url.toString();
}

export function CoverImage({
  src,
  title,
  className,
}: {
  src: string | null;
  title: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  // A portrait book cover's ~2:3 aspect ratio.
  const size = 'h-24 w-16';

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          size,
          'flex items-center justify-center rounded-md bg-muted text-sm text-muted-foreground',
          className
        )}
      >
        {title.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={sharpen(src)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(size, 'rounded-md object-contain', className)}
    />
  );
}
