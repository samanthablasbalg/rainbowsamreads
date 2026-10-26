import { test as base } from './reset-personal-data';
import { ApiClient } from '../api/api-client';

// Extends the personal-data reset with an `apiClient` for backend data setup.
// Specs import `test`/`expect` from here, so both authentication and isolation
// stay behind one fixture interface.

export const test = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, use) => {
    await use(new ApiClient(request));
  },
});

export { expect } from './reset-personal-data';
