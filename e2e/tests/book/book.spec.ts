import { test, expect } from '../../fixtures/api-client';
import { BookPage } from '../../page-objects/book.page';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { FinishedBooksPage } from '../../page-objects/finished-books.page';
import { StartReadingSheetPage } from '../../page-objects/start-reading-sheet.page';

const TITLE = 'Piranesi';
const AUTHOR = 'Susanna Clarke';

test('Reading a finished book again starts a new read and leaves the finished one', async ({
  page,
  apiClient,
}) => {
  const bookPage = new BookPage(page);
  const sheet = new StartReadingSheetPage(page);
  const finishedBooks = new FinishedBooksPage(page);
  const currentlyReading = new CurrentlyReadingPage(page);

  let bookId = '';

  await test.step('Seed a book that has been read and finished', async () => {
    bookId = await apiClient.createBook(TITLE, AUTHOR, 272);
    const engagementId = await apiClient.markAsReading(bookId);
    await apiClient.markAsFinished(engagementId);
    await bookPage.goto(bookId);
    await expect(bookPage.getStatusButton('Finished')).toBeVisible();
  });

  await test.step('Swap the status to Reading and start another read', async () => {
    await bookPage.startAnotherRead(TITLE, 'Finished');
    await expect(sheet.sheet).toHaveCount(0);
  });

  await test.step('The book page shows a read in progress, without navigating away', async () => {
    await expect(bookPage.getStatusButton('Reading')).toBeVisible();
    await expect(page).toHaveURL(`/books/${bookId}`);
  });

  await test.step('The finished read survives on the Finished shelf', async () => {
    await finishedBooks.goto();
    await expect(finishedBooks.getEntry(TITLE)).toBeVisible();
  });

  await test.step('The new read stands alongside it on Currently reading', async () => {
    await currentlyReading.goto();
    await expect(currentlyReading.getBookCard(TITLE)).toBeVisible();
  });
});
