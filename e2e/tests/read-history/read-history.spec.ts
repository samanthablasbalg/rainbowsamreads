import { expect, test } from '../../fixtures/api-client';
import { CardMenuPage } from '../../page-objects/card-menu.page';
import { ConfirmSheetPage } from '../../page-objects/confirm-sheet.page';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { EntryEditSheetPage } from '../../page-objects/entry-edit-sheet.page';
import { FinishedBooksPage } from '../../page-objects/finished-books.page';
import { ReadHistoryPage } from '../../page-objects/read-history.page';

test('A read’s page is reachable from currently reading and lists its entries', async ({
  page,
  apiClient,
}) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const cardMenu = new CardMenuPage(page);
  const history = new ReadHistoryPage(page);

  await test.step('Seed a book in progress with two entries on different days', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engId, 50, '2025-06-14');
    await apiClient.logProgress(engId, 100, '2025-06-15');
  });

  await test.step('Navigate to the read’s page via the currently-reading shelf', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu('Piranesi');
    await cardMenu.getViewHistoryItem('Piranesi').click();
  });

  await test.step('Verify both entries and the read’s dates are shown', async () => {
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toBeVisible();
    await expect(history.getDayGroup('Sat, Jun 14, 2025')).toBeVisible();
    await expect(history.startDateButton).toBeVisible();
    await expect(history.finishDateButton).toBeVisible();
  });
});

test('A finished read’s page is reachable from the finished shelf', async ({ page, apiClient }) => {
  const finished = new FinishedBooksPage(page);
  const cardMenu = new CardMenuPage(page);
  const history = new ReadHistoryPage(page);

  await test.step('Seed a finished book with one entry', async () => {
    const bookId = await apiClient.createBook('Dune', 'Frank Herbert', 412);
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engId, 100, '2025-06-15');
    await apiClient.markAsFinished(engId);
  });

  await test.step('Navigate to the read’s page via the finished shelf', async () => {
    await finished.goto();
    await finished.openRowMenu('Dune');
    await cardMenu.getViewHistoryItem('Dune').click();
  });

  await test.step('Verify the entry is listed', async () => {
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toBeVisible();
  });
});

test('Editing an entry’s date persists and renders the new date', async ({ page, apiClient }) => {
  const history = new ReadHistoryPage(page);
  const sheet = new EntryEditSheetPage(page);

  let engId = '';

  await test.step('Seed a book with an early start date and one entry', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-01-01' });
    await apiClient.logProgress(engId, 50, '2025-06-01');
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Open the entry and set a new date', async () => {
    await history.openEntry('Sun, Jun 1, 2025');
    await sheet.setDate('2025-06-15');
    await sheet.save();
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the entry moved to the new date', async () => {
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toBeVisible();
    await expect(history.getDayGroup('Sun, Jun 1, 2025')).toHaveCount(0);
  });
});

test('Editing the newest entry’s end page persists and shows the updated range', async ({
  page,
  apiClient,
}) => {
  const history = new ReadHistoryPage(page);
  const sheet = new EntryEditSheetPage(page);

  let engId = '';

  await test.step('Seed a book with one entry ending at page 50', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engId, 50, '2025-06-15');
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Open the entry and raise its end page', async () => {
    await history.openEntry('Sun, Jun 15, 2025');
    await sheet.setEndPage(100);
    await sheet.save();
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card shows the wider range', async () => {
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toContainText('p. 100');
  });
});

test('Deleting the newest entry reverts progress to the prior entry', async ({
  page,
  apiClient,
}) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const history = new ReadHistoryPage(page);
  const sheet = new EntryEditSheetPage(page);
  const confirm = new ConfirmSheetPage(page);

  let engId = '';

  await test.step('Seed a book logged to page 100 then page 200', async () => {
    const bookId = await apiClient.createBook('Dune', 'Frank Herbert', 412);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engId, 100, '2025-06-14');
    await apiClient.logProgress(engId, 200, '2025-06-15');
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Delete the newest entry through its sheet', async () => {
    await history.openEntry('Sun, Jun 15, 2025');
    await sheet.getDeleteButton('Sun, Jun 15, 2025').click();
    await confirm.getConfirmButton('Delete').click();
    await expect(confirm.sheet).toHaveCount(0);
  });

  await test.step('Verify only the prior entry remains', async () => {
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toHaveCount(0);
    await expect(history.getDayGroup('Sat, Jun 14, 2025')).toBeVisible();
  });

  await test.step('Verify the progress bar reverted to the prior entry', async () => {
    await currentlyReading.goto();
    await expect(currentlyReading.getProgressBar('Dune')).toHaveAccessibleName(
      'Dune progress: 24%'
    );
  });
});

test('A mixed read’s history shows each session in the ruler it was logged on', async ({
  page,
  apiClient,
}) => {
  const history = new ReadHistoryPage(page);

  let engId = '';

  await test.step('Seed a page session, then an audio session the next day', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engId, 136, '2025-06-14');
    await apiClient.addFormat(engId, 'audio', 600);
    await apiClient.logAudioProgress(engId, 360, '2025-06-15');
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Verify the page session is measured in pages', async () => {
    await expect(history.getDayGroup('Sat, Jun 14, 2025')).toContainText('p. 136');
    await expect(history.getDayGroup('Sat, Jun 14, 2025')).toContainText('+136 pp');
  });

  await test.step('Verify the audio session is measured in time', async () => {
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toContainText('06:00');
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toContainText('+60 min');
  });
});
