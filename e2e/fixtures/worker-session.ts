import { APIRequestContext, test as base } from '@playwright/test';

type WorkerStorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;
export type WorkerSession = { storageState: WorkerStorageState; userId: string };

export const test = base.extend<{}, { workerSession: WorkerSession }>({
  storageState: ({ workerSession }, use) => use(workerSession.storageState),
  workerSession: [
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

        const me = await request.get('/api/auth/me');
        if (!me.ok()) {
          throw new Error(
            `Worker ${workerInfo.parallelIndex} identity lookup failed with ${me.status()}: ${await me.text()}`
          );
        }
        const { id: userId } = (await me.json()) as { id: string };

        await use({ storageState: await request.storageState(), userId });
      } finally {
        await request.dispose();
      }
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
