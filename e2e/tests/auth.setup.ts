import { test as setup } from '@playwright/test';
import { AUTH_FILE } from '../auth-file';

// Runs once before the browser projects (see playwright.config.ts's `auth setup`
// project). The e2e suite is single-user (clean-db.ts's truncate leaves the
// `users` row alone), so one login for the whole run is enough.
setup('log in as the e2e test user', async ({ request }) => {
  // Through the proxy (baseURL, from playwright.config.ts). ApiClient now
  // goes through it too, so this one cookie covers both page navigations and
  // ApiClient's setup calls — there's only one origin to record it under.
  await request.post('/api/auth/test-login');

  await request.storageState({ path: AUTH_FILE });
});
