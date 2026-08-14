import type { ErrorType } from '@/api/mutator/axios-instance';

export type DetailError = ErrorType<{ detail?: string }>;

export const errorDetail = (err: DetailError, fallback: string) =>
  err.response?.data?.detail ?? fallback;
