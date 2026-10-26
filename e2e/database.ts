import { Client } from 'pg';

const DATABASE_URL = 'postgresql://postgres:postgres@db:5432/reading_tracker';

export async function withDatabaseTransaction(
  operation: (client: Client) => Promise<void>
): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query('BEGIN');
    await operation(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

export async function resetPersonalData(client: Client, userId: string): Promise<void> {
  for (const table of [
    'progress_logs',
    'reviews',
    'engagement_editions',
    'engagements',
    'standalone_entries',
    'blog_posts',
  ]) {
    await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  }
}
