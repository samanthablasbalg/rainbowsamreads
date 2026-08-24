import { expect, test } from '../../fixtures/api-client';
import { AddFormatSheetPage } from '../../page-objects/add-format-sheet.page';
import { CardMenuPage } from '../../page-objects/card-menu.page';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { ProgressLogSheetPage } from '../../page-objects/progress-log-sheet.page';

test('Adding an audiobook to a print read logs minutes against the shared frontier', async ({
  page,
  apiClient,
}) => {
  const currentlyReading = new CurrentlyReadingPage(page);
  const cardMenu = new CardMenuPage(page);
  const addFormat = new AddFormatSheetPage(page);
  const logSheet = new ProgressLogSheetPage(page);

  await test.step('Seed a print read logged to half its pages', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke', 272);
    const engagementId = await apiClient.markAsReading(bookId);
    await apiClient.logProgress(engagementId, 136);
  });

  await test.step('Add a ten-hour audiobook from the card menu', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu('Piranesi');
    await cardMenu.getAddFormatItem('Piranesi').click();
    await addFormat.addFormat('Audio', '10:00');
    await expect(addFormat.sheet).toHaveCount(0);
  });

  await test.step('Verify the read now carries both formats', async () => {
    await expect(currentlyReading.getFormatChip('Piranesi', 'print')).toBeVisible();
    await expect(currentlyReading.getFormatChip('Piranesi', 'audio')).toBeVisible();
  });

  await test.step('Open the log sheet on the minute ruler', async () => {
    await currentlyReading.openLogSheet('Piranesi');
    await logSheet.pickUnit('Minutes');
  });

  await test.step('Verify it resumes halfway through the audiobook', async () => {
    await expect(logSheet.getFromDisplay('05:00')).toBeVisible();
    await expect(logSheet.getMaxDisplay('10:00')).toBeVisible();
  });

  await test.step('Log an hour of listening', async () => {
    await logSheet.enterPosition('06:00');
    await logSheet.save('Piranesi');
    await expect(logSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify completion is measured on the ruler just logged', async () => {
    await expect(currentlyReading.getProgressBar('Piranesi')).toHaveAccessibleName(
      'Piranesi progress: 60%'
    );
  });
});
