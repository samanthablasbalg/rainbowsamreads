import { useMediaQuery } from './use-media-query';

// `pointer: coarse` is the primary input's precision, not the viewport's width -- a
// narrow desktop window still has a fine (mouse/trackpad) pointer, and a tablet in
// landscape still has a coarse (touch) one. This is the one place that query string
// lives; call sites that need the dialog-vs-sheet split call this instead of repeating it.
export function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}
