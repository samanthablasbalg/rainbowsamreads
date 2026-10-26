import { expect, test } from '../../fixtures/catalog-writer';
import { E2E_CATALOG } from '../../catalog/e2e-catalog';
import { CatalogPage } from '../../page-objects/catalog.page';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { ProgressLogSheetPage } from '../../page-objects/progress-log-sheet.page';
import { StartReadingSheetPage } from '../../page-objects/start-reading-sheet.page';

test('Marking a catalog book as reading updates it in place and on Currently reading', async ({
  page,
}) => {
  const catalog = new CatalogPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new StartReadingSheetPage(page);
  const piranesi = E2E_CATALOG.piranesi;

  await test.step('Mark the book as reading from the catalog', async () => {
    await catalog.goto();
    await catalog.markAsReading(piranesi.title);
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the catalog row refreshes without navigation', async () => {
    await expect(page).toHaveURL('/library/catalog');
    await expect(catalog.getStatusButton(piranesi.title, 'Reading')).toBeVisible();
  });

  await test.step('Verify it appears under Currently reading', async () => {
    await currentlyReading.goto();
    await expect(currentlyReading.getBookCard(piranesi.title)).toBeVisible();
  });
});

test('Starting a TBR book from the catalog updates its existing engagement', async ({
  page,
  apiClient,
}) => {
  const catalog = new CatalogPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new StartReadingSheetPage(page);
  const educated = E2E_CATALOG.educated;

  await test.step('Put the catalog book on the To Read shelf', async () => {
    await apiClient.addToTbr(educated.id);
  });

  await test.step('Start the existing To Read engagement from the catalog', async () => {
    await catalog.goto();
    await catalog.chooseStatus(educated.title, 'To read', 'Reading');
    await sheet.startAs(educated.title, 'Print');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the catalog row refreshes without navigation', async () => {
    await expect(page).toHaveURL('/library/catalog');
    await expect(catalog.getStatusButton(educated.title, 'Reading')).toBeVisible();
  });

  await test.step('Verify the same book appears under Currently reading', async () => {
    await currentlyReading.goto();
    await expect(currentlyReading.getBookCard(educated.title)).toBeVisible();
  });
});

test('Starting a book as audio shows the audio icon on the Currently Reading row', async ({
  page,
}) => {
  const catalog = new CatalogPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new StartReadingSheetPage(page);
  const piranesi = E2E_CATALOG.piranesi;

  await test.step('Start the book as audio from the catalog', async () => {
    await catalog.goto();
    await catalog.markAsReading(piranesi.title, 'Audio');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the audio chip appears on the Currently Reading row', async () => {
    await currentlyReading.goto();
    await expect(currentlyReading.getFormatChip(piranesi.title, 'audio')).toBeVisible();
  });
});

test('Starting a read with a length override measures progress against the override', async ({
  page,
}) => {
  const catalog = new CatalogPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new ProgressLogSheetPage(page);
  const startReadingSheet = new StartReadingSheetPage(page);
  const piranesi = E2E_CATALOG.piranesi;

  await test.step('Start the read from the catalog at an overridden 500 pages', async () => {
    await catalog.goto();
    await catalog.markAsReading(piranesi.title, 'Print', '500');
    await expect(startReadingSheet.sheet).toHaveCount(0);
  });

  await test.step('Open the progress log sheet', async () => {
    await currentlyReading.goto();
    await currentlyReading.openLogSheet(piranesi.title);
  });

  await test.step('Verify the sheet caps at the override, not the catalog page count', async () => {
    await expect(sheet.getMaxDisplay('500')).toBeVisible();
  });

  await test.step('Log page 250', async () => {
    await sheet.enterPosition('250');
    await sheet.save(piranesi.title);
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify completion is half of the override, not of the page count', async () => {
    await expect(currentlyReading.getProgressBar(piranesi.title)).toHaveAccessibleName(
      `${piranesi.title} progress: 50%`
    );
  });
});

test('Deleting a book with no engagements removes it from the library', async ({
  page,
  apiClient,
  catalogWriter,
}) => {
  const catalog = new CatalogPage(page);

  await test.step('Create a book with no engagements', async () => {
    const bookId = await apiClient.createBook(catalogWriter.title, catalogWriter.author);
    catalogWriter.trackBook(bookId);
  });

  await test.step('Delete the book from the catalog', async () => {
    await catalog.goto();
    await catalog.deleteBook(catalogWriter.title);
  });

  await test.step('Verify it no longer appears in the library', async () => {
    await expect(catalog.getRow(catalogWriter.title)).toHaveCount(0);
  });
});
