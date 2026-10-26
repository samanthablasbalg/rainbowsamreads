import { expect, test } from '../../fixtures/api-client';
import { E2E_CATALOG } from '../../catalog/e2e-catalog';
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
  const piranesi = E2E_CATALOG.piranesi;

  await test.step('Start Piranesi in print and read half its pages', async () => {
    const engagementId = await apiClient.markAsReading(piranesi.id);
    await apiClient.logProgress(engagementId, 136);
  });

  await test.step('Add a ten-hour audiobook from the card menu', async () => {
    await currentlyReading.goto();
    await currentlyReading.openCardMenu(piranesi.title);
    await cardMenu.getAddFormatItem(piranesi.title).click();
    await addFormat.addFormat('Audio');
    await expect(addFormat.sheet).toHaveCount(0);
  });

  await test.step('Verify the read now carries both formats', async () => {
    await expect(currentlyReading.getFormatChip(piranesi.title, 'print')).toBeVisible();
    await expect(currentlyReading.getFormatChip(piranesi.title, 'audio')).toBeVisible();
  });

  await test.step('Open the log sheet on the minute ruler', async () => {
    await currentlyReading.openLogSheet(piranesi.title);
    await logSheet.pickUnit('Minutes');
  });

  await test.step('Verify it resumes halfway through the audiobook', async () => {
    await expect(logSheet.getFromDisplay('05:00')).toBeVisible();
    await expect(logSheet.getMaxDisplay('10:00')).toBeVisible();
  });

  await test.step('Log an hour of listening', async () => {
    await logSheet.enterPosition('06:00');
    await logSheet.save(piranesi.title);
    await expect(logSheet.sheet).toHaveCount(0);
  });

  await test.step('Verify completion is measured on the ruler just logged', async () => {
    await expect(currentlyReading.getProgressBar(piranesi.title)).toHaveAccessibleName(
      `${piranesi.title} progress: 60%`
    );
  });
});
