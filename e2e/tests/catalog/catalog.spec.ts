import { expect, test } from '../../fixtures/api-client';
import { CatalogPage } from '../../page-objects/catalog.page';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { ProgressLogSheetPage } from '../../page-objects/progress-log-sheet.page';

test('Marking a catalog book as reading moves it to Currently reading', async ({
  page,
  apiClient,
}) => {
  const catalog = new CatalogPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);

  await test.step('Create a book in the library', async () => {
    await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
  });

  await test.step('Mark the book as reading from the catalog', async () => {
    await catalog.goto();
    await catalog.markAsReading('Piranesi');
  });

  await test.step('Verify the app navigates to Currently reading', async () => {
    await expect(page).toHaveURL('/home');
  });

  await test.step('Verify it appears under Currently reading', async () => {
    await expect(currentlyReading.getBookCard('Piranesi')).toBeVisible();
  });
});

test('Starting a book as audio shows the audio icon on the Currently Reading row', async ({
  page,
  apiClient,
}) => {
  const catalog = new CatalogPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);

  await test.step('Create a book in the library', async () => {
    await apiClient.createBook('Piranesi', 'Susanna Clarke');
  });

  await test.step('Start the book as audio from the catalog', async () => {
    await catalog.goto();
    await catalog.markAsReading('Piranesi', 'Audio', '10:00');
  });

  await test.step('Verify the app navigates to Currently reading', async () => {
    await expect(page).toHaveURL('/home');
  });

  await test.step('Verify the audio chip appears on the Currently Reading row', async () => {
    await expect(currentlyReading.getFormatChip('Piranesi', 'audio')).toBeVisible();
  });
});

test('Starting a read with a length override measures progress against the override', async ({
  page,
  apiClient,
}) => {
  const catalog = new CatalogPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new ProgressLogSheetPage(page);

  await test.step('Create a book the catalog holds at 300 pages', async () => {
    await apiClient.createBook('Piranesi', 'Susanna Clarke', 300);
  });

  await test.step('Start the read from the catalog at an overridden 500 pages', async () => {
    await catalog.goto();
    await catalog.markAsReading('Piranesi', 'Print', '500');
    await expect(page).toHaveURL('/home');
  });

  await test.step('Open the progress log sheet', async () => {
    await currentlyReading.openLogSheet('Piranesi');
  });

  await test.step('Verify the sheet caps at the override, not the catalog page count', async () => {
    await expect(sheet.getMaxDisplay('500')).toBeVisible();
  });

  await test.step('Log page 250', async () => {
    await sheet.enterPosition('250');
    await sheet.save('Piranesi');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify completion is half of the override, not of the page count', async () => {
    await expect(currentlyReading.getProgressBar('Piranesi')).toHaveAccessibleName(
      'Piranesi progress: 50%'
    );
  });
});

test('Deleting a book with no engagements removes it from the library', async ({
  page,
  apiClient,
}) => {
  const catalog = new CatalogPage(page);

  await test.step('Create a book with no engagements', async () => {
    await apiClient.createBook('Piranesi', 'Susanna Clarke');
  });

  await test.step('Delete the book from the catalog', async () => {
    await catalog.goto();
    await catalog.deleteBook('Piranesi');
  });

  await test.step('Verify it no longer appears in the library', async () => {
    await expect(catalog.getMarkAsReadingButton('Piranesi')).toHaveCount(0);
  });
});
