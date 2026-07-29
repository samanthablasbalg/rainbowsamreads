import { Locator, Page } from '@playwright/test';

/**
 * The shared confirmation surface. Renders as a bottom sheet on phone widths and a
 * dialog above them, with the same content either way, so everything here is scoped
 * to the component element rather than to whichever host opened it.
 */
export class ConfirmSheetPage {
  readonly sheet: Locator;
  readonly cancelButton: Locator;

  /** @param page - The Playwright page to drive the confirm sheet through. */
  constructor(public readonly page: Page) {
    this.sheet = page.locator('app-confirm-sheet');
    this.cancelButton = this.sheet.getByRole('button', { name: 'Cancel' });
  }

  /**
   * Locates the sheet's heading.
   * @param text - The expected title.
   * @returns The heading locator.
   */
  getTitle(text: string): Locator {
    return this.sheet.getByRole('heading', { name: text });
  }

  /**
   * Locates the confirming button, whose label differs per action.
   * @param label - The button's text, e.g. "Delete" or "Mark finished".
   * @returns The confirm button locator.
   */
  getConfirmButton(label: string): Locator {
    return this.sheet.getByRole('button', { name: label, exact: true });
  }
}
