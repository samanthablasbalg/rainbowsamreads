import { test as setup } from '@playwright/test';
import { Client } from 'pg';

const dbUrl = process.env['E2E_DATABASE_URL'];
if (!dbUrl) throw new Error('E2E_DATABASE_URL is not set');

setup('provision e2e database', async () => {
  const adminUrl = dbUrl.replace(/\/[^/]+$/, '/postgres');
  const dbName = dbUrl.split('/').pop()!;

  const client = new Client({ connectionString: adminUrl });
  await client.connect();

  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );
  if (!rowCount) {
    await client.query(`CREATE DATABASE "${dbName}"`);
  }
  await client.end();
});
