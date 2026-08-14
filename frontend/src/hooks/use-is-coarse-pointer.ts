import { useMediaQuery } from './use-media-query';

export function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)');
}
