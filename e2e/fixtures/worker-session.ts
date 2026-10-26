import { APIRequestContext, test as base } from '@playwright/test';

type WorkerStorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

export const test = base.extend<{}, { workerStorageState: WorkerStorageState }>({
  storageState: ({ workerStorageState }, use) => use(workerStorageState),
  workerStorageState: [
    async ({ playwright }, use, workerInfo) => {
      const request = await playwright.request.newContext({
        baseURL: workerInfo.project.use.baseURL,
      });

      try {
        const response = await request.post('/api/auth/test-login', {
          data: { persona: 'e2e', worker_index: workerInfo.parallelIndex },
        });
        if (!response.ok()) {
          throw new Error(
            `Worker ${workerInfo.parallelIndex} login failed with ${response.status()}: ${await response.text()}`
          );
        }

        await use(await request.storageState());
      } finally {
        await request.dispose();
      }
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
