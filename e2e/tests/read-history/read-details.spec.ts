import { expect, test } from '../../fixtures/api-client';
import { ReadHistoryPage } from '../../page-objects/read-history.page';

test('Editing the read’s start date persists and renders the new date', async ({
  page,
  apiClient,
}) => {
  const history = new ReadHistoryPage(page);

  let engId = '';

  await test.step('Seed a book in progress', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    engId = await apiClient.markAsReading(bookId);
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Set a past start date through the inline editor', async () => {
    await history.setStartDate('2025-01-01');
  });

  await test.step('Verify the new start date is shown', async () => {
    await expect(history.getDateDisplay('start date')).toContainText('Jan 1, 2025');
  });
});

test('Correcting the read’s length recomputes its completion percentage', async ({
  page,
  apiClient,
}) => {
  const history = new ReadHistoryPage(page);

  let engId = '';

  await test.step('Seed a 400 page book read to page 200', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 400);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.logProgress(engId, 200);
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
    await expect(history.progressBar).toHaveAccessibleName('Piranesi progress: 50%');
  });

  await test.step('Correct the length to 250 pages through the inline editor', async () => {
    await history.setLength('250');
  });

  await test.step('Verify the shorter length and the percentage it reflows to', async () => {
    await expect(history.lengthInput).toHaveCount(0);
    await expect(history.lengthButton).toHaveText('250 pages');
    await expect(history.progressBar).toHaveAccessibleName('Piranesi progress: 80%');
  });
});

test('Moving the start date onto the first session takes that session with it', async ({
  page,
  apiClient,
}) => {
  const history = new ReadHistoryPage(page);

  let engId = '';

  await test.step('Seed a read started Jan 1 with sessions on Jan 1 and Jan 10', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-01-01' });
    await apiClient.logProgress(engId, 50, '2025-01-01');
    await apiClient.logProgress(engId, 100, '2025-01-10');
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Move the start date forward to Jan 3', async () => {
    await history.setStartDate('2025-01-03');
  });

  await test.step('Verify the start date moved', async () => {
    await expect(history.getDateDisplay('start date')).toContainText('Jan 3, 2025');
  });

  await test.step('Verify the first session moved with it and the later one did not', async () => {
    await expect(history.getDayGroup('Fri, Jan 3, 2025')).toBeVisible();
    await expect(history.getDayGroup('Wed, Jan 1, 2025')).toHaveCount(0);
    await expect(history.getDayGroup('Fri, Jan 10, 2025')).toBeVisible();
  });
});

test('Moving the finish date back onto an earlier day takes the closing session with it', async ({
  page,
  apiClient,
}) => {
  const history = new ReadHistoryPage(page);

  let engId = '';

  await test.step('Seed a read finished on Jun 13, its last session that same day', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    engId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engId, { started_on: '2025-06-01' });
    await apiClient.logProgress(engId, 100, '2025-06-05');
    await apiClient.logProgress(engId, 272, '2025-06-13');
    await apiClient.markAsFinished(engId, '2025-06-13');
  });

  await test.step('Navigate to the read’s page', async () => {
    await history.goto(engId);
  });

  await test.step('Move the finish date back to Jun 7', async () => {
    await history.setFinishDate('2025-06-07');
  });

  await test.step('Verify the finish date moved', async () => {
    await expect(history.getDateDisplay('finish date')).toContainText('Jun 7, 2025');
  });

  await test.step('Verify the closing session moved with it and the earlier one did not', async () => {
    await expect(history.getDayGroup('Sat, Jun 7, 2025')).toBeVisible();
    await expect(history.getDayGroup('Fri, Jun 13, 2025')).toHaveCount(0);
    await expect(history.getDayGroup('Thu, Jun 5, 2025')).toBeVisible();
  });
});
