import { useState } from 'react';
import { cn } from '@/lib/utils';

// Google hands out `zoom=1`, a ~128px thumbnail that visibly blurs anywhere bigger than a
// list row, and `edge=curl` draws a fake page-curl over the artwork. Both are query
// parameters on an image host, so a larger, flat cover is a rewrite rather than a
// re-import -- which also means it fixes every row already in the database.
//
// `zoom` picks a pre-rendered tier, and asking for one Google does not hold answers with a
// gray "image not available" JPEG at HTTP 200 -- so `onError` never fires and the fallback
// below never shows. `w` instead resizes the tier that always exists, capping at whatever
// resolution Google really has. 600 covers the largest cover on the site (the detail
// page's 240px, doubled for retina) and still beats what `zoom=3` returned.
//
// The protocol is forced because rows imported before the API served https kept a plain
// http URL, which Safari and Firefox block outright as mixed content on the deployed site.
function sharpen(src: string): string {
  if (!src.includes('books.google.com')) {
    return src;
  }
  const url = new URL(src);
  url.protocol = 'https:';
  url.searchParams.set('zoom', '1');
  url.searchParams.set('w', '600');
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
