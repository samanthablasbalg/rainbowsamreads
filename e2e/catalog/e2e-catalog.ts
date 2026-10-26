import { resetPersonalData, withDatabaseTransaction } from '../database';

type CatalogAuthor = { id: string; name: string };
export type CatalogBook = {
  id: string;
  title: string;
  author: CatalogAuthor;
  pageCount: number | null;
  editionIds: readonly [string, string, string];
  editionLengths: readonly [number | null, number | null, number | null];
};

const catalogUuid = (kind: number, index: number): string =>
  `e2e${kind.toString(16).padStart(5, '0')}-0000-4000-8000-${index.toString(16).padStart(12, '0')}`;

const authors = {
  susannaClarke: { id: catalogUuid(1, 1), name: 'E2E Susanna Clarke' },
  frankHerbert: { id: catalogUuid(1, 2), name: 'E2E Frank Herbert' },
  jrrTolkien: { id: catalogUuid(1, 3), name: 'E2E J.R.R. Tolkien' },
  nkJemisin: { id: catalogUuid(1, 4), name: 'E2E N. K. Jemisin' },
  davidFosterWallace: { id: catalogUuid(1, 5), name: 'E2E David Foster Wallace' },
  taraWestover: { id: catalogUuid(1, 6), name: 'E2E Tara Westover' },
  sallyRooney: { id: catalogUuid(1, 7), name: 'E2E Sally Rooney' },
  rfKuang: { id: catalogUuid(1, 8), name: 'E2E R.F. Kuang' },
  madelineMiller: { id: catalogUuid(1, 9), name: 'E2E Madeline Miller' },
  miraVoss: { id: catalogUuid(1, 10), name: 'E2E Mira Voss' },
} as const;

function catalogBook(
  index: number,
  title: string,
  author: CatalogAuthor,
  pageCount: number | null,
  audioMinutes: number | null = null
): CatalogBook {
  return {
    id: catalogUuid(2, index),
    title,
    author,
    pageCount,
    editionIds: [
      catalogUuid(3, index * 3 - 2),
      catalogUuid(3, index * 3 - 1),
      catalogUuid(3, index * 3),
    ],
    editionLengths: [pageCount, pageCount, audioMinutes],
  };
}

export const E2E_CATALOG = {
  piranesi: catalogBook(1, 'E2E Piranesi', authors.susannaClarke, 272, 600),
  dune: catalogBook(2, 'E2E Dune', authors.frankHerbert, 412, 600),
  hobbit: catalogBook(3, 'E2E The Hobbit', authors.jrrTolkien, null, 120),
  fifthSeason: catalogBook(4, 'E2E The Fifth Season', authors.nkJemisin, 400, 480),
  infiniteJest: catalogBook(5, 'E2E Infinite Jest', authors.davidFosterWallace, 1079),
  educated: catalogBook(6, 'E2E Educated', authors.taraWestover, 334),
  normalPeople: catalogBook(7, 'E2E Normal People', authors.sallyRooney, 273),
  babel: catalogBook(8, 'E2E Babel', authors.rfKuang, 546),
  circe: catalogBook(9, 'E2E Circe', authors.madelineMiller, 400),
  cartographersQuietRoom: catalogBook(
    10,
    "E2E The Cartographer's Quiet Room",
    authors.miraVoss,
    288
  ),
} as const;

const catalogBooks = Object.values(E2E_CATALOG);
const catalogAuthors = [
  ...new Map(catalogBooks.map((book) => [book.author.id, book.author])).values(),
];

export async function installE2eCatalog(): Promise<void> {
  await withDatabaseTransaction(async (client) => {
    for (const author of catalogAuthors) {
      await client.query(
        `INSERT INTO authors (id, name, bipoc, lgbt, other_attributes)
         VALUES ($1, $2, false, false, '{}')
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [author.id, author.name]
      );
    }

    for (const book of catalogBooks) {
      await client.query(
        `INSERT INTO books (
           id, title, default_page_count, default_audio_minutes, genres, publication_date_precision
         )
         VALUES ($1, $2, $3, $4, '{}', 'day')
         ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title,
             default_page_count = EXCLUDED.default_page_count,
             default_audio_minutes = EXCLUDED.default_audio_minutes`,
        [book.id, book.title, book.pageCount, book.editionLengths[2]]
      );
      await client.query('DELETE FROM book_authors WHERE book_id = $1', [book.id]);
      await client.query(
        `INSERT INTO book_authors (book_id, author_id, role)
         VALUES ($1, $2, 'author')
         ON CONFLICT DO NOTHING`,
        [book.id, book.author.id]
      );

      for (const [editionIndex, format] of ['print', 'digital', 'audio'].entries()) {
        await client.query(
          `INSERT INTO editions (id, book_id, format, length)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE
           SET book_id = EXCLUDED.book_id, format = EXCLUDED.format, length = EXCLUDED.length`,
          [book.editionIds[editionIndex], book.id, format, book.editionLengths[editionIndex]]
        );
      }
    }
  });
}

export async function removeE2eCatalog(): Promise<void> {
  await withDatabaseTransaction(async (client) => {
    const testUsers = await client.query<{ id: string }>(
      `SELECT id FROM users
       WHERE email = 'test-user@example.com'
          OR email ~ '^test-user-[0-9]+@example\\.com$'`
    );
    for (const user of testUsers.rows) {
      await resetPersonalData(client, user.id);
    }

    const bookIds = catalogBooks.map((book) => book.id);
    await client.query('DELETE FROM editions WHERE book_id = ANY($1::uuid[])', [bookIds]);
    await client.query('DELETE FROM book_authors WHERE book_id = ANY($1::uuid[])', [bookIds]);
    await client.query('DELETE FROM books WHERE id = ANY($1::uuid[])', [bookIds]);
    await client.query('DELETE FROM authors WHERE id = ANY($1::uuid[])', [
      catalogAuthors.map((author) => author.id),
    ]);
  });
}
