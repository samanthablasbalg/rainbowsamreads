import { Locator, Page } from '@playwright/test';

export type AddableFormat = 'Print' | 'Digital' | 'Audio';

/**
 * The sheet that binds another edition to a read already in progress, opened from the
 * Currently Reading card menu. Every format is listed, the ones already being read
 * included -- but those render as plain rows rather than buttons, so only a format
 * this read could still be added in is reachable by role.
 */
export class AddFormatSheetPage {
  // The sheet's root. Wait for this to be gone before asserting anything about the
  // page behind it: while a modal is open the rest of the page is aria-hidden, so
  // role-based absence assertions pass whether or not the action ran.
  readonly sheet: Locator;
  readonly addButton: Locator;

  /** @param page - The Playwright page the sheet is open on. */
  constructor(public readonly page: Page) {
    this.sheet = page.getByRole('dialog');
    this.addButton = this.sheet.getByRole('button', { name: 'Add format' });
  }

  /**
   * Locates a format's row. The row's accessible name carries its length and its Add
   * chip alongside the label, so the format name matches as a substring.
   * @param format - The format to locate.
   * @returns The format row locator.
   */
  getFormatButton(format: AddableFormat): Locator {
    return this.sheet.getByRole('button', { name: format });
  }

  /**
   * Locates the length field, one input relabelled by the picked format: "Pages" for
   * print and digital, "Length" for audio's HH:MM.
   * @param format - The format currently picked, which decides the label.
   * @returns The length input locator.
   */
  getLengthInput(format: AddableFormat): Locator {
    return this.sheet.getByRole('textbox', { name: format === 'Audio' ? 'Length' : 'Pages' });
  }

  /**
   * Adds a format to the read: picks it, optionally sets a length, and submits.
   * @param format - The format to add.
   * @param length - A length for this read: pages as digits, or HH:MM for audio. Omit
   *   to use the length already on record; required when there is none, as there is
   *   not for the synthetic audio edition every book is created with.
   */
  async addFormat(format: AddableFormat, length?: string): Promise<void> {
    await this.getFormatButton(format).click();
    if (length !== undefined) {
      await this.getLengthInput(format).fill(length);
    }
    await this.addButton.click();
  }
}
