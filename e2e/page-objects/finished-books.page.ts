import { Locator, Page } from '@playwright/test';
import { ConfirmSheetPage } from './confirm-sheet.page';

export class FinishedBooksPage {
  /** @param page - The Playwright page to drive the Finished books page through. */
  constructor(public readonly page: Page) {}

  /** Navigates to the Finished books page. */
  async goto(): Promise<void> {
    await this.page.goto('/library/finished');
  }

  /**
   * Locates a finished book's entry by title. Each row is a listitem labelled for
   * its book, which is also what scopes it away from the shelf nav above.
   * @param title - The book's title.
   * @returns The entry locator.
   */
  getEntry(title: string): Locator {
    return this.page.getByRole('listitem', { name: title });
  }

  /**
   * Locates the button that opens the review sheet for an unrated read. It is replaced
   * by the star rating once a rating exists.
   * @param title - The book's title.
   * @returns The add-rating button locator.
   */
  getAddRatingButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Add a rating for ${title}` });
  }

  /**
   * Locates a row's star rating. The stars are one image carrying the score as its
   * accessible name; the row's other images are the cover and the format icons, so this
   * is scoped to the entry and matched on the name's opening word.
   * @param title - The book's title.
   * @returns The star rating locator.
   */
  getRating(title: string): Locator {
    return this.getEntry(title).getByRole('img', { name: /^Rated/ });
  }

  /**
   * Locates a row's overflow menu trigger.
   * @param title - The book's title.
   * @returns The menu trigger locator.
   */
  getRowMenuButton(title: string): Locator {
    return this.page.getByRole('button', { name: `More actions for ${title}` });
  }

  /**
   * Locates the "Delete" item inside an opened row menu. The menu renders into an
   * overlay rather than inside the row, so this is located from the page.
   * @param title - The book's title.
   * @returns The delete menu item locator.
   */
  getDeleteItem(title: string): Locator {
    return this.page.getByRole('menuitem', { name: `Delete ${title}`, exact: true });
  }

  /**
   * Locates the review item inside an opened row menu. Its label is the same whether the
   * read has a review or not; only the visible wording changes.
   * @param title - The book's title.
   * @returns The review menu item locator.
   */
  getReviewItem(title: string): Locator {
    return this.page.getByRole('menuitem', { name: `Rate and review ${title}` });
  }

  /**
   * Opens a row's overflow menu. Its items are located through CardMenuPage, which the
   * shelves share with the currently-reading cards.
   * @param title - The book's title.
   */
  async openRowMenu(title: string): Promise<void> {
    await this.getRowMenuButton(title).click();
  }

  /**
   * Opens the review sheet from the row menu, which is the only route to it once a
   * rating exists and the Add rating button is gone.
   * @param title - The book's title.
   */
  async openReviewFromMenu(title: string): Promise<void> {
    await this.getRowMenuButton(title).click();
    await this.getReviewItem(title).click();
  }

  /**
   * Deletes an engagement: opens the row menu, chooses Delete, and confirms.
   * @param title - The book's title.
   */
  async deleteEngagement(title: string): Promise<void> {
    await this.getRowMenuButton(title).click();
    await this.getDeleteItem(title).click();
    await new ConfirmSheetPage(this.page).getConfirmButton('Delete').click();
  }
}
