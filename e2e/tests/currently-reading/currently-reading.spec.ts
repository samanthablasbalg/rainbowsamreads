import { expect, test } from '../../fixtures/api-client';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { ReadHistoryPage } from '../../page-objects/read-history.page';
import { ProgressLogSheetPage } from '../../page-objects/progress-log-sheet.page';

test('Logging progress advances the card in place and survives reload', async ({
  page,
  apiClient,
}) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new ProgressLogSheetPage(page);

  let initialOrder: string[] = [];

  await test.step('Seed two books, Dune logged to page 100 then Piranesi marked reading most recently', async () => {
    const piranesiId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    const duneId = await apiClient.createBook('Dune', 'Frank Herbert', 412);
    const duneEngId = await apiClient.markAsReading(duneId);
    await apiClient.logProgress(duneEngId, 100);
    await apiClient.markAsReading(piranesiId);
  });

  await test.step('Navigate and record the initial card order', async () => {
    await currentlyReading.goto();
    initialOrder = await currentlyReading.getCardTitlesInOrder();
  });

  await test.step('Open the log sheet for Dune', async () => {
    await currentlyReading.openLogSheet('Dune');
    await expect(sheet.getFromDisplay('100')).toBeVisible();
  });

  await test.step('Log a higher page', async () => {
    await sheet.enterPage(200);
    await sheet.save('Dune');
  });

  await test.step('Verify the progress bar advanced', async () => {
    await expect(currentlyReading.getProgressBar('Dune')).toHaveAccessibleName(
      'Dune progress: 49%'
    );
  });

  await test.step('Verify the list order is unchanged after logging', async () => {
    expect(await currentlyReading.getCardTitlesInOrder()).toEqual(initialOrder);
  });

  await test.step('Verify progress survives a reload and Dune is now first', async () => {
    await page.reload();
    await expect(currentlyReading.getProgressBar('Dune')).toHaveAccessibleName(
      'Dune progress: 49%'
    );
    expect(await currentlyReading.getCardTitlesInOrder()).toEqual(['Dune', 'Piranesi']);
  });
});

test('Backdating a log stores it under the chosen day', async ({ page, apiClient }) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new ProgressLogSheetPage(page);
  const history = new ReadHistoryPage(page);

  let engId = '';

  await test.step('Seed a book being read with an early start date', async () => {
    const bookId = await apiClient.createBook('Dune', 'Frank Herbert', 412);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-01-01' });
  });

  await test.step('Log a backdated entry', async () => {
    await currentlyReading.goto();
    await currentlyReading.openLogSheet('Dune');
    await sheet.openDatePicker();
    await sheet.setDate('2025-06-15');
    await sheet.enterPage(100);
    await sheet.save('Dune');
  });

  await test.step('Verify the progress bar reflects the backdated page', async () => {
    await expect(currentlyReading.getProgressBar('Dune')).toHaveAccessibleName(
      'Dune progress: 24%'
    );
  });

  await test.step('Verify the read’s page shows the entry under the chosen day', async () => {
    await history.goto(engId);
    await expect(history.getDayGroup('Sun, Jun 15, 2025')).toBeVisible();
  });
});

test('Audio log sheet shows HH:MM input instead of a page input', async ({ page, apiClient }) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new ProgressLogSheetPage(page);

  await test.step('Seed an audio read', async () => {
    const bookId = await apiClient.createBook('The Hobbit', 'J.R.R. Tolkien');
    await apiClient.markAsReading(bookId, 'audio');
  });

  await test.step('Navigate and open the log sheet', async () => {
    await currentlyReading.goto();
    await currentlyReading.openLogSheet('The Hobbit');
  });

  await test.step('Verify the HH:MM input is shown and the page input is absent', async () => {
    await expect(sheet.minuteInput).toBeVisible();
    await expect(sheet.pageInput).toHaveCount(0);
  });
});

test('Logging audio progress advances the completion percentage', async ({ page, apiClient }) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new ProgressLogSheetPage(page);

  await test.step('Seed an audio read with a 2-hour length', async () => {
    const bookId = await apiClient.createBook('The Hobbit', 'J.R.R. Tolkien');
    await apiClient.markAsReading(bookId, 'audio', 120);
  });

  await test.step('Navigate and open the log sheet', async () => {
    await currentlyReading.goto();
    await currentlyReading.openLogSheet('The Hobbit');
  });

  await test.step('Log 01:00 of progress', async () => {
    await sheet.enterMinute('01:00');
    await sheet.save('The Hobbit');
  });

  await test.step('Verify completion percentage is 50%', async () => {
    await expect(currentlyReading.getProgressBar('The Hobbit')).toHaveAccessibleName(
      'The Hobbit progress: 50%'
    );
  });
});

test('Audio log sheet pre-fills with the last logged minute', async ({ page, apiClient }) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new ProgressLogSheetPage(page);

  await test.step('Seed an audio read with progress logged to minute 75', async () => {
    const bookId = await apiClient.createBook('The Hobbit', 'J.R.R. Tolkien');
    const engId = await apiClient.markAsReading(bookId, 'audio', 180);
    await apiClient.logAudioProgress(engId, 75);
  });

  await test.step('Navigate and open the log sheet', async () => {
    await currentlyReading.goto();
    await currentlyReading.openLogSheet('The Hobbit');
  });

  await test.step('Verify the sheet pre-fills with 01:15', async () => {
    await expect(sheet.getFromDisplay('01:15')).toBeVisible();
  });
});

test('Catching the pages up to the audio re-reads without moving completion', async ({
  page,
  apiClient,
}) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const sheet = new ProgressLogSheetPage(page);

  await test.step('Seed an eight-hour audiobook heard to two hours, bound in digital too', async () => {
    const bookId = await apiClient.createBook('The Fifth Season', 'N. K. Jemisin', 400);
    const engId = await apiClient.markAsReading(bookId, 'audio', 480);
    await apiClient.logAudioProgress(engId, 120);
    await apiClient.addFormat(engId, 'digital');
  });

  await test.step('Open the log sheet on a read that stands a quarter of the way through', async () => {
    await currentlyReading.goto();
    await expect(currentlyReading.getProgressBar('The Fifth Season')).toHaveAccessibleName(
      'The Fifth Season progress: 25%'
    );
    await currentlyReading.openLogSheet('The Fifth Season');
  });

  await test.step('Re-read pages 50 to 75, behind where the listening had got to', async () => {
    await sheet.pickUnit('Pages');
    await sheet.enterFrom('50');
    await sheet.enterPage(75);
    await sheet.save('The Fifth Season');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify ground covered a second time left completion where it was', async () => {
    await expect(currentlyReading.getProgressBar('The Fifth Season')).toHaveAccessibleName(
      'The Fifth Season progress: 25%'
    );
  });

  await test.step('Verify the sheet still resumes on minutes, at the frontier', async () => {
    await currentlyReading.openLogSheet('The Fifth Season');
    await expect(sheet.getUnitButton('Minutes')).toHaveAttribute('aria-pressed', 'true');
    await expect(sheet.fromButton).toHaveText('02:00');
  });

  await test.step('Verify the page ruler resumes at its own catch-up position instead', async () => {
    await sheet.pickUnit('Pages');
    await expect(sheet.fromButton).toHaveText('75');
  });

  await test.step('Read the remaining pages up to the frontier', async () => {
    await sheet.enterPage(100);
    await sheet.save('The Fifth Season');
    await expect(sheet.sheet).toHaveCount(0);
    await expect(currentlyReading.getProgressBar('The Fifth Season')).toHaveAccessibleName(
      'The Fifth Season progress: 25%'
    );
  });

  await test.step('Verify both rulers now resume at the shared frontier', async () => {
    await currentlyReading.openLogSheet('The Fifth Season');
    await expect(sheet.fromButton).toHaveText('02:00');
    await sheet.pickUnit('Pages');
    await expect(sheet.fromButton).toHaveText('100');
  });

  await test.step('Listen half an hour past the frontier', async () => {
    await sheet.pickUnit('Minutes');
    await sheet.enterMinute('02:30');
    await sheet.save('The Fifth Season');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify only new ground moves completion', async () => {
    await expect(currentlyReading.getProgressBar('The Fifth Season')).toHaveAccessibleName(
      'The Fifth Season progress: 31%'
    );
  });
});
