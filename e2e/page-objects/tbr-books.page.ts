import { Locator, Page } from '@playwright/test';

export class TbrBooksPage {
  /** @param page - The Playwright page to drive the To Read page through. */
  constructor(public readonly page: Page) {}

  /** Navigates to the To Read page. */
  async goto(): Promise<void> {
    await this.page.goto('/library/tbr');
  }

  /**
   * Locates a TBR book's entry by title. Each row is a listitem labelled for its
   * book, which is also what scopes it away from the shelf nav above.
   * @param title - The book's title.
   * @returns The entry locator.
   */
  getEntry(title: string): Locator {
    return this.page.getByRole('listitem', { name: title });
  }

  /**
   * Locates the button that opens the start-reading sheet for a TBR book.
   * @param title - The book's title.
   * @returns The Mark as reading button locator.
   */
  getMarkAsReadingButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Mark ${title} as reading` });
  }
}
