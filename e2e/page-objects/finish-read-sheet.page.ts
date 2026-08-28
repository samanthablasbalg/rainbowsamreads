import { Locator, Page } from '@playwright/test';

/**
 * The sheet that Mark as finished opens from a currently-reading card or a book page.
 * Renders as a bottom drawer under a coarse pointer and a centred dialog under a fine
 * one, so everything here is scoped to the sheet rather than to whichever control
 * opened it.
 *
 * The ruler buttons only render for a read bound in both a page format and audio --
 * that is the case where the closing entry has two possible answers, so the sheet asks.
 */
export class FinishReadSheetPage {
  readonly sheet: Locator;
  readonly finishDateInput: Locator;
  readonly pagesButton: Locator;
  readonly minutesButton: Locator;
  readonly cancelButton: Locator;

  /** @param page - The Playwright page to drive the finish sheet through. */
  constructor(public readonly page: Page) {
    this.sheet = page.getByRole('dialog');
    // A native date input exposes no implicit `textbox` role, so it goes through its
    // label -- the same as ReadHistoryPage and ProgressLogSheetPage.
    this.finishDateInput = this.sheet.getByLabel('Finish date');
    this.pagesButton = this.sheet.getByRole('button', { name: 'Pages' });
    this.minutesButton = this.sheet.getByRole('button', { name: 'Minutes' });
    this.cancelButton = this.sheet.getByRole('button', { name: 'Cancel' });
  }

  /**
   * Locates the confirming button, which is named for the book so a card's menu item
   * and the sheet it opened never collide.
   * @param title - The book's title.
   * @returns The confirm button locator.
   */
  getConfirmButton(title: string): Locator {
    return this.sheet.getByRole('button', { name: `Mark ${title} as finished` });
  }

  /**
   * Sets the date the read finished on.
   * @param date - The date in yyyy-mm-dd format.
   */
  async setFinishDate(date: string): Promise<void> {
    await this.finishDateInput.fill(date);
  }
}
