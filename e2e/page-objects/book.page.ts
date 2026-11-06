import { Locator, Page } from '@playwright/test';
import { StartReadingSheetPage, StartableFormat } from './start-reading-sheet.page';

/** The statuses the book page's status control can show, as it labels them. */
export type BookStatus = 'Not tracked' | 'To read' | 'Reading' | 'Finished' | 'DNF';

/**
 * A book's own page. The metadata card carries the status control, which is a
 * dropdown over the read the page is showing -- except from an ending, where
 * picking Reading hands off to the start-reading sheet to open a new read.
 */
export class BookPage {
  readonly recommenderInput: Locator;

  /** @param page - The Playwright page to drive the book page through. */
  constructor(public readonly page: Page) {
    this.recommenderInput = page.getByRole('combobox', { name: 'Add...' });
  }

  /**
   * Navigates to a book's page.
   * @param bookId - The book's id.
   */
  async goto(bookId: string): Promise<void> {
    await this.page.goto(`/books/${bookId}`);
  }

  /**
   * Locates the status control, which names both what it is and the status it is
   * showing. It doubles as the assertion target for the page's current read.
   * @param status - The status the control should be showing.
   * @returns The status button locator.
   */
  getStatusButton(status: BookStatus): Locator {
    return this.page.getByRole('button', { name: `Status: ${status}` });
  }

  /**
   * Locates an item inside the opened status menu. The menu renders into an overlay
   * rather than inside the card, so it is located from the page.
   * @param status - The status to pick.
   * @returns The menu item locator.
   */
  getStatusMenuItem(status: Exclude<BookStatus, 'Not tracked'>): Locator {
    return this.page.getByRole('menuitem', { name: status });
  }

  /**
   * Picks a status from the menu. From an ending this only opens the start-reading
   * sheet -- see startAnotherRead for the whole journey.
   * @param from - The status currently showing, which labels the trigger.
   * @param to - The status to pick.
   */
  async chooseStatus(from: BookStatus, to: Exclude<BookStatus, 'Not tracked'>): Promise<void> {
    await this.getStatusButton(from).click();
    await this.getStatusMenuItem(to).click();
  }

  /**
   * Reads the book again from an ending: picks Reading, then fills and submits the
   * start-reading sheet the menu hands off to.
   * @param title - The book's title.
   * @param from - The ending the book is currently at.
   * @param format - The format to read in (defaults to Print).
   * @param length - A length for this read: pages as digits, or HH:MM for audio.
   *   Omit to use the length already on record.
   */
  async startAnotherRead(
    title: string,
    from: BookStatus,
    format: StartableFormat = 'Print',
    length?: string
  ): Promise<void> {
    await this.chooseStatus(from, 'Reading');
    await new StartReadingSheetPage(this.page).startAs(title, format, length);
  }

  /**
   * Locates a stored recommender in the open combobox.
   * @param name - The recommender's exact name.
   * @returns The matching option.
   */
  getRecommenderOption(name: string): Locator {
    return this.page.getByRole('option', { name, exact: true });
  }

  /**
   * Locates the recommender currently shown on the book.
   * @param name - The recommender's exact name.
   * @returns The static recommender text.
   */
  getRecommender(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }

  /**
   * Locates the control that removes a recommendation.
   * @param name - The recommender's exact name.
   * @returns The remove button.
   */
  getRemoveRecommendationButton(name: string): Locator {
    return this.page.getByRole('button', {
      name: `Remove recommendation by ${name}`,
      exact: true,
    });
  }

  /** Creates a recommender from the combobox's empty result. */
  async addNewRecommender(name: string): Promise<void> {
    await this.recommenderInput.fill(name);
    await this.page.getByRole('button', { name: `Add “${name}”`, exact: true }).click();
  }

  /** Selects an existing recommender from the combobox. */
  async selectRecommender(name: string): Promise<void> {
    await this.recommenderInput.click();
    await this.getRecommenderOption(name).click();
  }

  /** Removes the book's recommendation. */
  async removeRecommender(name: string): Promise<void> {
    await this.getRemoveRecommendationButton(name).click();
  }
}
