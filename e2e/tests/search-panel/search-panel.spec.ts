import { expect, test } from '../../fixtures/api-client';
import { SearchPanelPage } from '../../page-objects/search-panel.page';
import { StartReadingSheetPage } from '../../page-objects/start-reading-sheet.page';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { FinishedBooksPage } from '../../page-objects/finished-books.page';

test('Importing a search result adds it to the catalog without touching the library', async ({
  page,
}) => {
  const searchPanel = new SearchPanelPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);

  await test.step('Stub the search+import chain and open the app', async () => {
    await searchPanel.stubImportFlow();
    await currentlyReading.goto();
  });

  await test.step('Search for and import the result', async () => {
    await searchPanel.searchFor(searchPanel.stubbedTitle);
    await expect(searchPanel.getImportButton(searchPanel.stubbedTitle)).toBeVisible();
    await searchPanel.importBook(searchPanel.stubbedTitle);
  });

  await test.step('Decline adding it to the library', async () => {
    const sheet = new StartReadingSheetPage(page);
    await sheet.dismiss('No thanks — just import');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify it now shows as in the catalog, not the library', async () => {
    await currentlyReading.goto();
    await searchPanel.searchFor(searchPanel.stubbedTitle);
    await expect(searchPanel.getAddButton(searchPanel.stubbedTitle)).toBeVisible();
    await expect(searchPanel.getImportButton(searchPanel.stubbedTitle)).toHaveCount(0);
  });
});

test('A failed search shows an error, not a crash', async ({ page }) => {
  const searchPanel = new SearchPanelPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);

  await test.step('Stub a failing search and open the app', async () => {
    await searchPanel.stubSearchFailure();
    await currentlyReading.goto();
  });

  await test.step('Search while the backend is failing', async () => {
    await searchPanel.searchFor('Piranesi');
  });

  await test.step('Verify the error shows', async () => {
    await expect(searchPanel.searchError).toBeVisible();
  });
});

test('Adding a catalog result to my library sets its status', async ({ page, apiClient }) => {
  const searchPanel = new SearchPanelPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new StartReadingSheetPage(page);
  const finishedBooks = new FinishedBooksPage(page);
  const title = "The Cartographer's Quiet Room";

  await test.step('Create a catalog book with no engagement', async () => {
    await apiClient.createBook(title, 'Mira Voss');
    await currentlyReading.goto();
  });

  await test.step('Add it to my library as Finished, dated', async () => {
    await searchPanel.searchFor(title);
    await searchPanel.addBook(title);
    await sheet.chooseStatus(title, 'Finished');
    await sheet.addAs(title, 'Print', 'Finished', {
      startedOn: '2026-01-15',
      endedOn: '2026-02-20',
    });
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify it now shows its status, with no action', async () => {
    await currentlyReading.goto();
    await searchPanel.searchFor(title);
    await expect(searchPanel.getResultRow(title)).toContainText('Finished');
    await expect(searchPanel.getAddButton(title)).toHaveCount(0);
  });

  await test.step('Verify the finish date came back with it', async () => {
    await finishedBooks.goto();
    await expect(finishedBooks.getEntry(title)).toContainText(/Finished\b.*2026/);
  });
});
