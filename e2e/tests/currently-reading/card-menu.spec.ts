import { expect, test } from '../../fixtures/api-client';
import { E2E_CATALOG } from '../../catalog/e2e-catalog';
import { CardMenuPage } from '../../page-objects/card-menu.page';
import { ConfirmSheetPage } from '../../page-objects/confirm-sheet.page';
import { CatalogPage } from '../../page-objects/catalog.page';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { DnfBooksPage } from '../../page-objects/dnf-books.page';
import { FinishReadSheetPage } from '../../page-objects/finish-read-sheet.page';
import { FinishedBooksPage } from '../../page-objects/finished-books.page';
import { ReadHistoryPage } from '../../page-objects/read-history.page';

const dune = E2E_CATALOG.dune;

test('Marking a book finished from the card menu moves it to Read', async ({ page, apiClient }) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const cardMenu = new CardMenuPage(page);
  const finishSheet = new FinishReadSheetPage(page);
  const finishedBooks = new FinishedBooksPage(page);

  await test.step('Start reading Dune', async () => {
    await apiClient.markAsReading(dune.id);
  });

  await test.step('Choose Mark finished from the card menu', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu(dune.title);
    await cardMenu.getMarkFinishedItem(dune.title).click();
  });

  await test.step('Confirm the finish', async () => {
    await expect(finishSheet.finishDateInput).toBeVisible();
    await finishSheet.getConfirmButton(dune.title).click();
    await expect(finishSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify it left Currently reading', async () => {
    await expect(currentlyReading.getBookCard(dune.title)).toHaveCount(0);
  });

  await test.step('Verify it appears under Finished', async () => {
    await finishedBooks.goto();
    await expect(finishedBooks.getEntry(dune.title)).toBeVisible();
  });
});

test('Finishing on an earlier date dates the read from that day', async ({ page, apiClient }) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const cardMenu = new CardMenuPage(page);
  const finishSheet = new FinishReadSheetPage(page);
  const readHistory = new ReadHistoryPage(page);
  let engagementId = '';

  await test.step('Start Dune and log a session two days back', async () => {
    engagementId = await apiClient.markAsReading(dune.id);
    await apiClient.patchEngagementDates(engagementId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engagementId, 300, '2025-06-14');
  });

  await test.step('Finish it on the day after that session', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu(dune.title);
    await cardMenu.getMarkFinishedItem(dune.title).click();
    await finishSheet.setFinishDate('2025-06-15');
    await finishSheet.getConfirmButton(dune.title).click();
    await expect(finishSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the read finished on the date given, not today', async () => {
    await readHistory.goto(engagementId);
    await expect(readHistory.getDateDisplay('finish date')).toContainText('Jun 15, 2025');
  });

  await test.step('Verify the closing entry lands on that day too', async () => {
    await expect(readHistory.getDayGroup('Sun, Jun 15, 2025')).toContainText('p. 412');
  });
});

test('Finishing a two-format read closes it out on the ruler picked', async ({
  page,
  apiClient,
}) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const cardMenu = new CardMenuPage(page);
  const finishSheet = new FinishReadSheetPage(page);
  const readHistory = new ReadHistoryPage(page);
  let engagementId = '';

  await test.step('Start Dune in print and add its audio format', async () => {
    engagementId = await apiClient.markAsReading(dune.id);
    await apiClient.addFormat(engagementId, 'audio');
    await apiClient.patchEngagementDates(engagementId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engagementId, 206, '2025-06-14');
  });

  await test.step('Finish it in minutes rather than pages', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu(dune.title);
    await cardMenu.getMarkFinishedItem(dune.title).click();
    await expect(finishSheet.getConfirmButton(dune.title)).toBeDisabled();
    await finishSheet.minutesButton.click();
    await finishSheet.setFinishDate('2025-06-15');
    await finishSheet.getConfirmButton(dune.title).click();
    await expect(finishSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the closing entry runs out the audiobook, not the pages', async () => {
    await readHistory.goto(engagementId);
    await expect(readHistory.getDayGroup('Sun, Jun 15, 2025')).toContainText('10:00');
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

  await test.step('Start Dune and log progress', async () => {
    const engId = await apiClient.markAsReading(dune.id);
    await apiClient.logProgress(engId, 100);
  });

  await test.step('Choose Mark as DNF from the card menu', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu(dune.title);
    await cardMenu.getMarkDnfItem(dune.title).click();
  });

  await test.step('Confirm the DNF', async () => {
    await expect(confirmSheet.getTitle(`Mark "${dune.title}" as did not finish?`)).toBeVisible();
    await confirmSheet.getConfirmButton('Mark as DNF').click();
    await expect(confirmSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify it left Currently reading', async () => {
    await expect(currentlyReading.getBookCard(dune.title)).toHaveCount(0);
  });

  await test.step('Verify it appears under the DNF section', async () => {
    await dnfBooks.goto();
    await expect(dnfBooks.getEntry(dune.title)).toBeVisible();
  });
});

test('Deleting a read from the card menu removes it for good', async ({ page, apiClient }) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const cardMenu = new CardMenuPage(page);
  const confirmSheet = new ConfirmSheetPage(page);
  const catalog = new CatalogPage(page);

  await test.step('Start Dune and log progress', async () => {
    const engId = await apiClient.markAsReading(dune.id);
    await apiClient.logProgress(engId, 100);
  });

  await test.step('Choose Delete from the card menu', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu(dune.title);
    await cardMenu.getDeleteItem(dune.title).click();
  });

  await test.step('Confirm the delete', async () => {
    await expect(confirmSheet.getTitle(`Delete this read of "${dune.title}"?`)).toBeVisible();
    await confirmSheet.getConfirmButton('Delete').click();
    await expect(confirmSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card is gone and stays gone after a reload', async () => {
    await expect(currentlyReading.getBookCard(dune.title)).toHaveCount(0);
    await page.reload();
    await expect(currentlyReading.getBookCard(dune.title)).toHaveCount(0);
  });

  await test.step('Verify the book itself survives, with no read in progress', async () => {
    await catalog.goto();
    await expect(catalog.getStatusButton(dune.title, 'Not tracked')).toBeVisible();
  });
});
