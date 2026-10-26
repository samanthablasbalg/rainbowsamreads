import { test as setup } from '@playwright/test';
import { installE2eCatalog } from '../catalog/e2e-catalog';

setup('install the immutable e2e catalog', async () => {
  await installE2eCatalog();
});
