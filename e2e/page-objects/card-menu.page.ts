import { Locator, Page } from '@playwright/test';

/**
 * The overflow menu on a Currently Reading card. Its items render into a CDK
 * overlay rather than inside the card, so they are located from the page rather
 * than scoped to the card element. Open it with CurrentlyReadingPage.openCardMenu.
 */
export class CardMenuPage {
  /** @param page - The Playwright page to drive the card menu through. */
  constructor(public readonly page: Page) {}

  /**
   * Locates the "Add another format" item, which a read already bound in every format
   * does not offer.
   * @param title - The book's title.
   * @returns The menu item locator.
   */
  getAddFormatItem(title: string): Locator {
    return this.page.getByRole('menuitem', { name: `Add another format to ${title}` });
  }

  /**
   * Locates the "View history" item.
   * @param title - The book's title.
   * @returns The menu item locator.
   */
  getViewHistoryItem(title: string): Locator {
    return this.page.getByRole('menuitem', { name: `View history for ${title}` });
  }

  /**
   * Locates the "Mark finished" item.
   * @param title - The book's title.
   * @returns The menu item locator.
   */
  getMarkFinishedItem(title: string): Locator {
    return this.page.getByRole('menuitem', { name: `Mark ${title} as finished` });
  }

  /**
   * Locates the "Mark as DNF" item.
   * @param title - The book's title.
   * @returns The menu item locator.
   */
  getMarkDnfItem(title: string): Locator {
    return this.page.getByRole('menuitem', { name: `Mark ${title} as DNF` });
  }

  /**
   * Locates the "Delete" item.
   * @param title - The book's title.
   * @returns The menu item locator.
   */
  getDeleteItem(title: string): Locator {
    return this.page.getByRole('menuitem', { name: `Delete ${title}`, exact: true });
  }
}
