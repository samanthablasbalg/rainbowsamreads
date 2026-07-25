import { test as setup } from '@playwright/test';
import { Client } from 'pg';
import { execSync } from 'child_process';
import path from 'path';

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

  const backendDir = path.resolve(__dirname, '../../backend');
  // The e2e app is single-user, so both URLs point at the same database.
  // APP_DATABASE_URL is the owner connection on purpose: switching e2e to
  // app_user turns RLS on underneath the suite, which is #181's job.
  const env = { ...process.env, DATABASE_URL: dbUrl, APP_DATABASE_URL: dbUrl };

  // Migrations grant privileges to app_user, so the role has to exist first.
  // Nothing else creates it on this path — the e2e backend is started by
  // Playwright's webServer as a bare uvicorn, not through the container start
  // command that provisions it in a deployment.
  execSync('python -m app.provision', { cwd: backendDir, env, stdio: 'inherit' });

  execSync('python -m alembic upgrade head', {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });
});
