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

  getAddReviewButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Add review for ${title}` });
  }

  getEditReviewButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Edit review for ${title}` });
  }

  getReviewSummary(title: string): Locator {
    return this.page.getByLabel(`Review summary for ${title}`);
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
   * Deletes an engagement: opens the row menu, chooses Delete, and confirms.
   * @param title - The book's title.
   */
  async deleteEngagement(title: string): Promise<void> {
    await this.getRowMenuButton(title).click();
    await this.getDeleteItem(title).click();
    await new ConfirmSheetPage(this.page).getConfirmButton('Delete').click();
  }
}
