import { expect, test } from '../../fixtures/api-client';
import { E2E_CATALOG } from '../../catalog/e2e-catalog';
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
  const educated = E2E_CATALOG.educated;

  await test.step('Add Educated to To Read without choosing a format', async () => {
    await apiClient.addToTbr(educated.id);
    await tbrBooks.goto();
    await expect(tbrBooks.getEntry(educated.title)).toBeVisible();
  });

  await test.step('Mark it as reading in print', async () => {
    await tbrBooks.getMarkAsReadingButton(educated.title).click();
    await sheet.startAs(educated.title, 'Print');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('It is gone from the To Read shelf', async () => {
    await expect(tbrBooks.getEntry(educated.title)).toHaveCount(0);
  });

  await test.step('It is on Currently reading', async () => {
    await currentlyReading.goto();
    await expect(currentlyReading.getBookCard(educated.title)).toBeVisible();
  });
});
