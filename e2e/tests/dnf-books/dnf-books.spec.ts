import { expect, test } from '../../fixtures/api-client';
import { E2E_CATALOG } from '../../catalog/e2e-catalog';
import { DnfBooksPage } from '../../page-objects/dnf-books.page';
import { ReviewSheetPage } from '../../page-objects/review-sheet.page';

test('DNF books support adding a review the same way finished books do', async ({
  page,
  apiClient,
}) => {
  const dnfBooks = new DnfBooksPage(page);
  const sheet = new ReviewSheetPage(page);
  const infiniteJest = E2E_CATALOG.infiniteJest;

  await test.step('Mark Infinite Jest as DNF without a review', async () => {
    const engId = await apiClient.markAsReading(infiniteJest.id);
    await apiClient.markAsDnf(engId);
  });

  await test.step('Navigate and open the review sheet', async () => {
    await dnfBooks.goto();
    await dnfBooks.getAddRatingButton(infiniteJest.title).click();
  });

  await test.step('Enter a rating and save', async () => {
    await sheet.setRating(2);
    await sheet.save(infiniteJest.title);
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card shows the rating and the Add rating button is gone', async () => {
    await expect(dnfBooks.getRating(infiniteJest.title)).toHaveAccessibleName('Rated 2 out of 5');
    await expect(dnfBooks.getAddRatingButton(infiniteJest.title)).toHaveCount(0);
  });
});
