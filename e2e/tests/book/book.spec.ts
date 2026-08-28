import { test, expect } from '../../fixtures/api-client';
import { BookPage } from '../../page-objects/book.page';
import { CurrentlyReadingPage } from '../../page-objects/currently-reading.page';
import { DnfBooksPage } from '../../page-objects/dnf-books.page';
import { FinishedBooksPage } from '../../page-objects/finished-books.page';
import { FinishReadSheetPage } from '../../page-objects/finish-read-sheet.page';
import { ReadHistoryPage } from '../../page-objects/read-history.page';
import { StartReadingSheetPage } from '../../page-objects/start-reading-sheet.page';

const TITLE = 'Piranesi';
const AUTHOR = 'Susanna Clarke';
const TODAY = new Date().toLocaleDateString('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

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

test('Switching an in-progress read to Finished from the book page shelves it as finished', async ({
  page,
  apiClient,
}) => {
  const bookPage = new BookPage(page);
  const finishSheet = new FinishReadSheetPage(page);
  const finishedBooks = new FinishedBooksPage(page);
  const readHistory = new ReadHistoryPage(page);

  let bookId = '';
  let engagementId = '';

  await test.step('Seed a read whose last session was logged well before today', async () => {
    bookId = await apiClient.createBook(TITLE, AUTHOR, 272);
    engagementId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engagementId, { started_on: '2026-05-01' });
    await apiClient.logProgress(engagementId, 60, '2026-05-10');
    await apiClient.logProgress(engagementId, 120, '2026-05-15');
    await bookPage.goto(bookId);
    await expect(bookPage.getStatusButton('Reading')).toBeVisible();
  });

  await test.step('Pick Finished and confirm the finish details', async () => {
    await bookPage.chooseStatus('Reading', 'Finished');
    await expect(finishSheet.finishDateInput).toHaveValue(new Date().toISOString().slice(0, 10));
    await finishSheet.getConfirmButton(TITLE).click();
    await expect(finishSheet.sheet).toHaveCount(0);
  });

  await test.step('The status control flips in place, without navigating away', async () => {
    await expect(bookPage.getStatusButton('Finished')).toBeVisible();
    await expect(page).toHaveURL(`/books/${bookId}`);
  });

  await test.step('The read lands on the Finished shelf', async () => {
    await finishedBooks.goto();
    await expect(finishedBooks.getEntry(TITLE)).toBeVisible();
  });

  await test.step('It is finished today, not on the last logged day', async () => {
    await readHistory.goto(engagementId);
    await expect(readHistory.getDateDisplay('finish date')).toContainText(TODAY);
  });
});

test('Switching an in-progress read to DNF from the book page abandons it on the last logged day', async ({
  page,
  apiClient,
}) => {
  const bookPage = new BookPage(page);
  const dnfBooks = new DnfBooksPage(page);
  const readHistory = new ReadHistoryPage(page);

  let bookId = '';
  let engagementId = '';

  await test.step('Seed a read whose last session was logged well before today', async () => {
    bookId = await apiClient.createBook(TITLE, AUTHOR, 272);
    engagementId = await apiClient.markAsReading(bookId);
    await apiClient.patchEngagementDates(engagementId, { started_on: '2026-05-01' });
    await apiClient.logProgress(engagementId, 60, '2026-05-10');
    await apiClient.logProgress(engagementId, 120, '2026-05-15');
    await bookPage.goto(bookId);
    await expect(bookPage.getStatusButton('Reading')).toBeVisible();
  });

  await test.step('Pick DNF from the status menu', async () => {
    await bookPage.chooseStatus('Reading', 'DNF');
    await expect(bookPage.getStatusButton('DNF')).toBeVisible();
  });

  await test.step('The read lands on the DNF shelf', async () => {
    await dnfBooks.goto();
    await expect(dnfBooks.getEntry(TITLE)).toBeVisible();
  });

  await test.step("It is abandoned on the last session's date, not today", async () => {
    await readHistory.goto(engagementId);
    await expect(readHistory.getDateDisplay('abandon date')).toContainText('May 15, 2026');
  });
});
