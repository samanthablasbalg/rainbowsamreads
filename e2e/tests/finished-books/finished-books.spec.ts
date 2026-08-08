import { expect, test } from '../../fixtures/api-client';
import { CatalogPage } from '../../page-objects/catalog.page';
import { FinishedBooksPage } from '../../page-objects/finished-books.page';
import { ReviewSheetPage } from '../../page-objects/review-sheet.page';

test('Finished books page shows "Add rating" for a finished book without a review', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);

  await test.step('Seed a finished book with no review', async () => {
    const bookId = await apiClient.createBook('Dune', 'Frank Herbert');
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.markAsFinished(engId);
  });

  await test.step('Navigate to the Finished books page', async () => {
    await finishedBooks.goto();
  });

  await test.step('Verify "Add rating" button is visible', async () => {
    await expect(finishedBooks.getAddRatingButton('Dune')).toBeVisible();
  });
});

test('Saving a rating and review text shows the rating on the card but not the text', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);
  const sheet = new ReviewSheetPage(page);

  await test.step('Seed a finished book with no review', async () => {
    const bookId = await apiClient.createBook('Normal People', 'Sally Rooney');
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.markAsFinished(engId);
  });

  await test.step('Navigate and open the review sheet', async () => {
    await finishedBooks.goto();
    await finishedBooks.getAddRatingButton('Normal People').click();
  });

  await test.step('Enter rating 4.25 and review text, then save', async () => {
    await sheet.setRating(4.25);
    await sheet.enterReview('Quiet and devastating.');
    await sheet.save('Normal People');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card shows the rating and the Add rating button is gone', async () => {
    await expect(finishedBooks.getRating('Normal People')).toHaveAccessibleName(
      'Rated 4.25 out of 5'
    );
    await expect(finishedBooks.getAddRatingButton('Normal People')).toHaveCount(0);
  });

  await test.step('Verify the review text stays off the card', async () => {
    await expect(finishedBooks.getEntry('Normal People')).not.toContainText(
      'Quiet and devastating.'
    );
  });
});

test('Saving a rating without review text shows the rating on the card', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);
  const sheet = new ReviewSheetPage(page);

  await test.step('Seed a finished book with no review', async () => {
    const bookId = await apiClient.createBook('Piranesi', 'Susanna Clarke');
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.markAsFinished(engId);
  });

  await test.step('Navigate and open the review sheet', async () => {
    await finishedBooks.goto();
    await finishedBooks.getAddRatingButton('Piranesi').click();
  });

  await test.step('Enter rating 5 with no body and save', async () => {
    await sheet.setRating(5);
    await sheet.save('Piranesi');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card shows the rating', async () => {
    await expect(finishedBooks.getRating('Piranesi')).toHaveAccessibleName('Rated 5 out of 5');
  });
});

test('An existing review opens as static text and edits from the row menu', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);
  const sheet = new ReviewSheetPage(page);

  await test.step('Seed a finished book with an existing review', async () => {
    const bookId = await apiClient.createBook('Babel', 'R.F. Kuang');
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.markAsFinished(engId);
    await apiClient.upsertReview(engId, 3.0, 'Good but dense.');
  });

  await test.step('Navigate and open the review sheet from the row menu', async () => {
    await finishedBooks.goto();
    await finishedBooks.openReviewFromMenu('Babel');
  });

  await test.step('Verify the body shows as static text with no editor', async () => {
    await expect(sheet.getReviewText('Good but dense.')).toBeVisible();
    await expect(sheet.reviewTextarea).toHaveCount(0);
  });

  await test.step('Swap the static text for the editor and rewrite it', async () => {
    await sheet.editReview('Babel');
    await expect(sheet.reviewTextarea).toHaveValue('Good but dense.');
    await sheet.enterReview('Dense, and worth it.');
  });

  await test.step('Change the rating to 4.75 and save', async () => {
    await sheet.setRating(4.75);
    await sheet.save('Babel');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card shows the new rating', async () => {
    await expect(finishedBooks.getRating('Babel')).toHaveAccessibleName('Rated 4.75 out of 5');
  });

  await test.step('Verify the rewritten text persists on reopening', async () => {
    await finishedBooks.openReviewFromMenu('Babel');
    await expect(sheet.getReviewText('Dense, and worth it.')).toBeVisible();
  });
});

test('Clearing the rating returns the card to its Add rating button', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);
  const sheet = new ReviewSheetPage(page);

  await test.step('Seed a finished book with an existing rating', async () => {
    const bookId = await apiClient.createBook('Circe', 'Madeline Miller');
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.markAsFinished(engId);
    await apiClient.upsertReview(engId, 4.0, null);
  });

  await test.step('Navigate and open the review sheet from the row menu', async () => {
    await finishedBooks.goto();
    await finishedBooks.openReviewFromMenu('Circe');
  });

  await test.step('Drag the rating back to zero and save', async () => {
    await sheet.setRating(0);
    await sheet.save('Circe');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the rating is gone and Add rating is back', async () => {
    await expect(finishedBooks.getRating('Circe')).toHaveCount(0);
    await expect(finishedBooks.getAddRatingButton('Circe')).toBeVisible();
  });
});

test('Deleting a finished engagement with a review removes it and leaves the book in the catalog', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);
  const catalog = new CatalogPage(page);

  await test.step('Seed a finished book with a review', async () => {
    const bookId = await apiClient.createBook('Babel', 'R.F. Kuang');
    const engId = await apiClient.markAsReading(bookId);
    await apiClient.markAsFinished(engId);
    await apiClient.upsertReview(engId, 3.0, 'Good but dense.');
  });

  await test.step('Delete the engagement from the Finished books page', async () => {
    await finishedBooks.goto();
    await finishedBooks.deleteEngagement('Babel');
  });

  await test.step('Verify it no longer appears under Finished', async () => {
    await expect(finishedBooks.getEntry('Babel')).toHaveCount(0);
  });

  await test.step('Verify the book remains in the catalog', async () => {
    await catalog.goto();
    await expect(catalog.getMarkAsReadingButton('Babel')).toBeVisible();
  });
});
