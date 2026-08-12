import { useState } from 'react';
import { cn } from '@/lib/utils';

// `src` is nullable (no edition or book cover on file) and, even when present, can
// 404 or otherwise fail to load. Both cases fall back to the same placeholder: the
// title's first letter on a muted tile, the same convention `AvatarFallback` already
// uses for the user's initial, and more useful than a generic icon since a list of
// ~11 books needs its fallbacks to still tell one book from another.
//
// The image itself is decorative -- the title it illustrates is always rendered as
// text beside it, so labelling it too would announce the same thing twice.
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

  // A book cover's ~2:3 aspect ratio, sized to match a row's cover-led layout.
  // Callers override via className the same way Avatar's default size is overridden.
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
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(size, 'rounded-md object-contain', className)}
    />
  );
}
