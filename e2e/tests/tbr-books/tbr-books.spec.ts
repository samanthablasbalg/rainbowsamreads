import { expect, test } from '../../fixtures/api-client';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { StartReadingSheetPage } from '../../page-objects/start-reading-sheet.page';
import { TbrBooksPage } from '../../page-objects/tbr-books.page';

test('Starting a TBR book moves it from To Read to Currently reading', async ({
  page,
  apiClient,
}) => {
  const tbrBooks = new TbrBooksPage(page);
  const sheet = new StartReadingSheetPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);

  await test.step('Seed a book on the To Read shelf with no format', async () => {
    const bookId = await apiClient.createBook('Educated', 'Tara Westover', 334);
    await apiClient.addToTbr(bookId);
    await tbrBooks.goto();
    await expect(tbrBooks.getEntry('Educated')).toBeVisible();
  });

  await test.step('Mark it as reading in print', async () => {
    await tbrBooks.getMarkAsReadingButton('Educated').click();
    await sheet.startAs('Educated', 'Print');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('It is gone from the To Read shelf', async () => {
    await expect(tbrBooks.getEntry('Educated')).toHaveCount(0);
  });

  await test.step('It is on Currently reading', async () => {
    await currentlyReading.goto();
    await expect(currentlyReading.getBookCard('Educated')).toBeVisible();
  });
});
