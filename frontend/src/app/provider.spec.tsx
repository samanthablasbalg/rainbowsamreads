import { AxiosError, type AxiosResponse } from 'axios';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { AppProvider } from './provider';

type RetryPredicate = (failureCount: number, error: Error) => boolean;

// The predicate is configured inside AppProvider and never exported, so this reaches it
// the way a component would -- through the context -- and then calls it directly. The
// alternative, driving real failures through a real query, would sit through the
// client's exponential backoff for every case.
function getRetryPredicate() {
  let client: QueryClient | undefined;

  function Probe() {
    client = useQueryClient();
    return null;
  }

  // RTL's own render, not the helper in test/render.tsx: AppProvider brings its own
  // providers, and the helper's would sit on top of them.
  render(
    <AppProvider>
      <Probe />
    </AppProvider>
  );

  return client!.getDefaultOptions().queries!.retry as RetryPredicate;
}

function axiosErrorWithStatus(status: number) {
  const error = new AxiosError('the request was refused');
  error.response = { status } as AxiosResponse;
  return error;
}

describe('the app query client', () => {
  let shouldRetry: RetryPredicate;

  beforeAll(() => {
    shouldRetry = getRetryPredicate();
  });

  it.each([
    // 401 and 404 mean the request itself was answered and rejected. Asking again
    // cannot change the answer.
    ['a request refused with 401', 0, axiosErrorWithStatus(401), false],
    ['a request refused with 404', 0, axiosErrorWithStatus(404), false],
    ['a server error', 0, axiosErrorWithStatus(500), true],
    // A network failure -- DNS, connection refused, offline. There is no status to
    // read, and trying again is exactly what might work.
    ['an error that carries no response at all', 0, new AxiosError('Network Error'), true],
    ['a second attempt', 1, new AxiosError('Network Error'), true],
    ['a third attempt', 2, new AxiosError('Network Error'), false],
  ] as const)('%s (failureCount=%i) → retry: %s', (_label, failureCount, error, expected) => {
    expect(shouldRetry(failureCount, error)).toBe(expected);
  });
});
