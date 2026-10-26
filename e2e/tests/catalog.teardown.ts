import { test as teardown } from '@playwright/test';
import { removeE2eCatalog } from '../catalog/e2e-catalog';

teardown('remove the immutable e2e catalog', async () => {
  await removeE2eCatalog();
});
