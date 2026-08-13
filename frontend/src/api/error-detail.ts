import type { ErrorType } from '@/api/mutator/axios-instance';

// FastAPI's HTTPException body: {"detail": "..."}. Optional because a 500 or a
// network failure has no body at all.
export type DetailError = ErrorType<{ detail?: string }>;

export const errorDetail = (err: DetailError, fallback: string) =>
  err.response?.data?.detail ?? fallback;
