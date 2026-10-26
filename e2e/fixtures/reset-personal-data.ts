import { resetPersonalData, withDatabaseTransaction } from '../database';
import { test as base } from './worker-session';

export const test = base.extend<{ resetPersonalData: void }>({
  resetPersonalData: [
    async ({ workerSession }, use) => {
      await withDatabaseTransaction((client) => resetPersonalData(client, workerSession.userId));
      await use();
    },
    { auto: true },
  ],
});

export { expect } from './worker-session';
