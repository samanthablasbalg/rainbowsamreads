import { expect, test } from '../../fixtures/api-client';
import { E2E_CATALOG } from '../../catalog/e2e-catalog';
import { CatalogPage } from '../../page-objects/catalog.page';
import { FinishedBooksPage } from '../../page-objects/finished-books.page';
import { ReviewSheetPage } from '../../page-objects/review-sheet.page';

const dune = E2E_CATALOG.dune;
const normalPeople = E2E_CATALOG.normalPeople;
const piranesi = E2E_CATALOG.piranesi;
const babel = E2E_CATALOG.babel;
const circe = E2E_CATALOG.circe;

test('Finished books page shows "Add rating" for a finished book without a review', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);

  await test.step('Finish Dune without a review', async () => {
    const engId = await apiClient.markAsReading(dune.id);
    await apiClient.markAsFinished(engId);
  });

  await test.step('Navigate to the Finished books page', async () => {
    await finishedBooks.goto();
  });

  await test.step('Verify "Add rating" button is visible', async () => {
    await expect(finishedBooks.getAddRatingButton(dune.title)).toBeVisible();
  });
});

test('Saving a rating and review text shows the rating on the card but not the text', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);
  const sheet = new ReviewSheetPage(page);

  await test.step('Finish Normal People without a review', async () => {
    const engId = await apiClient.markAsReading(normalPeople.id);
    await apiClient.markAsFinished(engId);
  });

  await test.step('Navigate and open the review sheet', async () => {
    await finishedBooks.goto();
    await finishedBooks.getAddRatingButton(normalPeople.title).click();
  });

  await test.step('Enter rating 4.25 and review text, then save', async () => {
    await sheet.setRating(4.25);
    await sheet.enterReview('Quiet and devastating.');
    await sheet.save(normalPeople.title);
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card shows the rating and the Add rating button is gone', async () => {
    await expect(finishedBooks.getRating(normalPeople.title)).toHaveAccessibleName(
      'Rated 4.25 out of 5'
    );
    await expect(finishedBooks.getAddRatingButton(normalPeople.title)).toHaveCount(0);
  });

  await test.step('Verify the review text stays off the card', async () => {
    await expect(finishedBooks.getEntry(normalPeople.title)).not.toContainText(
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

  await test.step('Finish Piranesi without a review', async () => {
    const engId = await apiClient.markAsReading(piranesi.id);
    await apiClient.markAsFinished(engId);
  });

  await test.step('Navigate and open the review sheet', async () => {
    await finishedBooks.goto();
    await finishedBooks.getAddRatingButton(piranesi.title).click();
  });

  await test.step('Enter rating 5 with no body and save', async () => {
    await sheet.setRating(5);
    await sheet.save(piranesi.title);
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card shows the rating', async () => {
    await expect(finishedBooks.getRating(piranesi.title)).toHaveAccessibleName('Rated 5 out of 5');
  });
});

test('An existing review opens as static text and edits from the row menu', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);
  const sheet = new ReviewSheetPage(page);

  await test.step('Finish Babel and add a review', async () => {
    const engId = await apiClient.markAsReading(babel.id);
    await apiClient.markAsFinished(engId);
    await apiClient.upsertReview(engId, 3.0, 'Good but dense.');
  });

  await test.step('Navigate and open the review sheet from the row menu', async () => {
    await finishedBooks.goto();
    await finishedBooks.openReviewFromMenu(babel.title);
  });

  await test.step('Verify the body shows as static text with no editor', async () => {
    await expect(sheet.getReviewText('Good but dense.')).toBeVisible();
    await expect(sheet.reviewTextarea).toHaveCount(0);
  });

  await test.step('Swap the static text for the editor and rewrite it', async () => {
    await sheet.editReview(babel.title);
    await expect(sheet.reviewTextarea).toHaveValue('Good but dense.');
    await sheet.enterReview('Dense, and worth it.');
  });

  await test.step('Change the rating to 4.75 and save', async () => {
    await sheet.setRating(4.75);
    await sheet.save(babel.title);
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the card shows the new rating', async () => {
    await expect(finishedBooks.getRating(babel.title)).toHaveAccessibleName('Rated 4.75 out of 5');
  });

  await test.step('Verify the rewritten text persists on reopening', async () => {
    await finishedBooks.openReviewFromMenu(babel.title);
    await expect(sheet.getReviewText('Dense, and worth it.')).toBeVisible();
  });
});

test('Clearing the rating returns the card to its Add rating button', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);
  const sheet = new ReviewSheetPage(page);

  await test.step('Finish Circe and add a rating', async () => {
    const engId = await apiClient.markAsReading(circe.id);
    await apiClient.markAsFinished(engId);
    await apiClient.upsertReview(engId, 4.0, null);
  });

  await test.step('Navigate and open the review sheet from the row menu', async () => {
    await finishedBooks.goto();
    await finishedBooks.openReviewFromMenu(circe.title);
  });

  await test.step('Drag the rating back to zero and save', async () => {
    await sheet.setRating(0);
    await sheet.save(circe.title);
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('Verify the rating is gone and Add rating is back', async () => {
    await expect(finishedBooks.getRating(circe.title)).toHaveCount(0);
    await expect(finishedBooks.getAddRatingButton(circe.title)).toBeVisible();
  });
});

test('Deleting a finished engagement with a review removes it and leaves the book in the catalog', async ({
  page,
  apiClient,
}) => {
  const finishedBooks = new FinishedBooksPage(page);
  const catalog = new CatalogPage(page);

  await test.step('Finish Babel and add a review', async () => {
    const engId = await apiClient.markAsReading(babel.id);
    await apiClient.markAsFinished(engId);
    await apiClient.upsertReview(engId, 3.0, 'Good but dense.');
  });

  await test.step('Delete the engagement from the Finished books page', async () => {
    await finishedBooks.goto();
    await finishedBooks.deleteEngagement(babel.title);
  });

  await test.step('Verify it no longer appears under Finished', async () => {
    await expect(finishedBooks.getEntry(babel.title)).toHaveCount(0);
  });

  await test.step('Verify the book remains in the catalog', async () => {
    await catalog.goto();
    await expect(catalog.getStatusButton(babel.title, 'Not tracked')).toBeVisible();
  });
});
