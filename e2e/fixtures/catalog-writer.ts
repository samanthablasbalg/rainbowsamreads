import { createHash } from 'node:crypto';
import { withDatabaseTransaction } from '../database';
import { test as base } from './api-client';

type CatalogWriter = {
  title: string;
  author: string;
  externalId: string;
  trackBook: (bookId: string) => void;
};

export const test = base.extend<{ catalogWriter: CatalogWriter }>({
  catalogWriter: async ({}, use, testInfo) => {
    const suffix = createHash('sha256')
      .update(`${testInfo.project.name}:${testInfo.testId}`)
      .digest('hex')
      .slice(0, 12);
    const title = `E2E writable book ${suffix}`;
    const author = `E2E writable author ${suffix}`;
    const externalId = `e2e-${suffix}`;
    const bookIds: string[] = [];

    await use({
      title,
      author,
      externalId,
      trackBook: (bookId) => bookIds.push(bookId),
    });

    await withDatabaseTransaction(async (client) => {
      const books = await client.query<{ id: string }>(
        `SELECT id FROM books
         WHERE id = ANY($1::uuid[]) OR title = $2 OR google_books_id = $3`,
        [bookIds, title, externalId]
      );
      const cleanupBookIds = books.rows.map((book) => book.id);

      await client.query(
        `DELETE FROM progress_logs
         WHERE engagement_id IN (SELECT id FROM engagements WHERE book_id = ANY($1::uuid[]))`,
        [cleanupBookIds]
      );
      await client.query(
        `DELETE FROM reviews
         WHERE engagement_id IN (SELECT id FROM engagements WHERE book_id = ANY($1::uuid[]))`,
        [cleanupBookIds]
      );
      await client.query(
        `DELETE FROM engagement_editions
         WHERE engagement_id IN (SELECT id FROM engagements WHERE book_id = ANY($1::uuid[]))`,
        [cleanupBookIds]
      );
      await client.query('DELETE FROM engagements WHERE book_id = ANY($1::uuid[])', [
        cleanupBookIds,
      ]);
      await client.query('DELETE FROM standalone_entries WHERE book_id = ANY($1::uuid[])', [
        cleanupBookIds,
      ]);
      await client.query('DELETE FROM editions WHERE book_id = ANY($1::uuid[])', [cleanupBookIds]);
      await client.query('DELETE FROM book_authors WHERE book_id = ANY($1::uuid[])', [
        cleanupBookIds,
      ]);
      await client.query('DELETE FROM books WHERE id = ANY($1::uuid[])', [cleanupBookIds]);
      await client.query(
        `DELETE FROM authors
         WHERE name = $1
           AND NOT EXISTS (SELECT 1 FROM book_authors WHERE author_id = authors.id)
           AND NOT EXISTS (SELECT 1 FROM standalone_entries WHERE author_id = authors.id)`,
        [author]
      );
    });
  },
});

export { expect } from './api-client';
