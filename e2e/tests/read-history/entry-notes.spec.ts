import { expect, test } from '../../fixtures/api-client';
import { EntryEditSheetPage } from '../../page-objects/entry-edit-sheet.page';
import { ProgressLogSheetPage } from '../../page-objects/progress-log-sheet.page';
import { ReadHistoryPage } from '../../page-objects/read-history.page';

test('Logging progress with a note shows the note on the entry', async ({ page, apiClient }) => {
  const history = new ReadHistoryPage(page);
  const sheet = new ProgressLogSheetPage(page);

  let engId = '';

  await test.step('Seed a book in progress read to page 50', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engId, 50, '2025-06-14');
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Log page 100 with a note, backdated to a fixed day', async () => {
    await history.logProgressButton.click();
    await sheet.enterPosition('100');
    await sheet.openDatePicker();
    await sheet.setDate('2025-06-15');
    await sheet.addNote('The Beauty of the House is immeasurable.');
    await sheet.save('Piranesi');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the entry carries the note', async () => {
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toContainText(
      'The Beauty of the House is immeasurable.'
    );
  });
});

test('Noting two quotes on the page already reached keeps both', async ({ page, apiClient }) => {
  const history = new ReadHistoryPage(page);
  const sheet = new ProgressLogSheetPage(page);

  let engId = '';

  await test.step('Seed a book in progress read to page 100', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engId, 100, '2025-06-14');
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Note a first quote without advancing past page 100', async () => {
    await history.logProgressButton.click();
    await sheet.enterPosition('100');
    await sheet.openDatePicker();
    await sheet.setDate('2025-06-15');
    await sheet.addNote('The first quote from this page.');
    await sheet.save('Piranesi');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Note a second quote on the same page', async () => {
    await history.logProgressButton.click();
    await sheet.enterPosition('100');
    await sheet.openDatePicker();
    await sheet.setDate('2025-06-15');
    await sheet.addNote('The second quote from this page.');
    await sheet.save('Piranesi');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify both notes sit under the same day', async () => {
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toContainText(
      'The first quote from this page.'
    );
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toContainText(
      'The second quote from this page.'
    );
  });
});

test('Adding a note to an existing entry persists it', async ({ page, apiClient }) => {
  const history = new ReadHistoryPage(page);
  const sheet = new EntryEditSheetPage(page);

  let engId = '';

  await test.step('Seed a book with one entry carrying no note', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engId, 50, '2025-06-15');
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Open the entry and add a note to it', async () => {
    await history.openEntry('Sun, Jun 15, 2025');
    await sheet.addNote('A line worth keeping.');
    await sheet.save();
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the note is shown on the entry', async () => {
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toContainText('A line worth keeping.');
  });
});
