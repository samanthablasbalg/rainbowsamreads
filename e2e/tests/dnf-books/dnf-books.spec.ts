import { expect, test } from '../../fixtures/api-client';
import { DnfBooksPage } from '../../page-objects/dnf-books.page';
import { ReviewSheetPage } from '../../page-objects/review-sheet.page';

test('DNF books support adding a review the same way finished books do', async ({
  page,
  apiClient,
}) => {
  const dnfBooks = new DnfBooksPage(page);
  const sheet = new ReviewSheetPage(page);

  await test.step('Seed a DNF book with no review', async () => {
    const bookId = await apiClient.createBook('Infinite Jest', 'David Foster Wallace');
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.markAsDnf(engId);
  });

  await test.step('Navigate and open the review sheet', async () => {
    await dnfBooks.goto();
    await dnfBooks.getAddRatingButton('Infinite Jest').click();
  });

  await test.step('Enter a rating and save', async () => {
    await sheet.setRating(2);
    await sheet.save('Infinite Jest');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card shows the rating and the Add rating button is gone', async () => {
    await expect(dnfBooks.getRating('Infinite Jest')).toHaveAccessibleName('Rated 2 out of 5');
    await expect(dnfBooks.getAddRatingButton('Infinite Jest')).toHaveCount(0);
  });
});
