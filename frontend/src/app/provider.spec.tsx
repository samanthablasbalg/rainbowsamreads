import { AxiosError, type AxiosResponse } from 'axios';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { AppProvider } from './provider';

type RetryPredicate = (failureCount: number, error: Error) => boolean;

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
    ['a request refused with 401', 0, axiosErrorWithStatus(401), false],
    ['a request refused with 404', 0, axiosErrorWithStatus(404), false],
    ['a server error', 0, axiosErrorWithStatus(500), true],
    ['an error that carries no response at all', 0, new AxiosError('Network Error'), true],
    ['a second attempt', 1, new AxiosError('Network Error'), true],
    ['a third attempt', 2, new AxiosError('Network Error'), false],
  ] as const)('%s (failureCount=%i) → retry: %s', (_label, failureCount, error, expected) => {
    expect(shouldRetry(failureCount, error)).toBe(expected);
  });
});
