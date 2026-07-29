import { expect, test } from '../../fixtures/api-client';
import { CardMenuPage } from '../../page-objects/card-menu.page';
import { ConfirmSheetPage } from '../../page-objects/confirm-sheet.page';
import { CatalogPage } from '../../page-objects/catalog.page';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { DnfBooksPage } from '../../page-objects/dnf-books.page';
import { FinishedBooksPage } from '../../page-objects/finished-books.page';

test('Marking a book finished from the card menu moves it to Read', async ({ page, apiClient }) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const cardMenu = new CardMenuPage(page);
  const confirmSheet = new ConfirmSheetPage(page);
  const finishedBooks = new FinishedBooksPage(page);

  await test.step('Seed a book being read', async () => {
    const bookId = await apiClient.createBook('Dune', 'Frank Herbert', 412);
    await apiClient.markAsReading(bookId);
  });

  await test.step('Choose Mark finished from the card menu', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu('Dune');
    await cardMenu.getMarkFinishedItem('Dune').click();
  });

  await test.step('Confirm the finish', async () => {
    await expect(confirmSheet.getTitle('Mark "Dune" as finished?')).toBeVisible();
    await confirmSheet.getConfirmButton('Mark finished').click();
    await expect(confirmSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify it left Currently reading', async () => {
    await expect(currentlyReading.getBookCard('Dune')).toHaveCount(0);
  });

  await test.step('Verify it appears under Finished', async () => {
    await finishedBooks.goto();
    await expect(finishedBooks.getEntry('Dune')).toBeVisible();
  });
});

test('Marking a book DNF from the card menu moves it to the DNF section', async ({
  page,
  apiClient,
}) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const cardMenu = new CardMenuPage(page);
  const confirmSheet = new ConfirmSheetPage(page);
  const dnfBooks = new DnfBooksPage(page);

  await test.step('Seed a book being read with progress', async () => {
    const bookId = await apiClient.createBook('Dune', 'Frank Herbert', 412);
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.logProgress(engId, 100);
  });

  await test.step('Choose Mark as DNF from the card menu', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu('Dune');
    await cardMenu.getMarkDnfItem('Dune').click();
  });

  await test.step('Confirm the DNF', async () => {
    await expect(confirmSheet.getTitle('Mark "Dune" as did not finish?')).toBeVisible();
    await confirmSheet.getConfirmButton('Mark as DNF').click();
    await expect(confirmSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify it left Currently reading', async () => {
    await expect(currentlyReading.getBookCard('Dune')).toHaveCount(0);
  });

  await test.step('Verify it appears under the DNF section', async () => {
    await dnfBooks.goto();
    await expect(dnfBooks.getEntry('Dune')).toBeVisible();
  });
});

test('Deleting a read from the card menu removes it for good', async ({ page, apiClient }) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const cardMenu = new CardMenuPage(page);
  const confirmSheet = new ConfirmSheetPage(page);
  const catalog = new CatalogPage(page);

  await test.step('Seed a book being read with progress', async () => {
    const bookId = await apiClient.createBook('Dune', 'Frank Herbert', 412);
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.logProgress(engId, 100);
  });

  await test.step('Choose Delete from the card menu', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu('Dune');
    await cardMenu.getDeleteItem('Dune').click();
  });

  await test.step('Confirm the delete', async () => {
    await expect(confirmSheet.getTitle('Delete this read of "Dune"?')).toBeVisible();
    await confirmSheet.getConfirmButton('Delete').click();
    await expect(confirmSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card is gone and stays gone after a reload', async () => {
    await expect(currentlyReading.getBookCard('Dune')).toHaveCount(0);
    await page.reload();
    await expect(currentlyReading.getBookCard('Dune')).toHaveCount(0);
  });

  await test.step('Verify the book itself survives, with no read in progress', async () => {
    await catalog.goto();
    await expect(catalog.getMarkAsReadingButton('Dune')).toBeVisible();
  });
});
