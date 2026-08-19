import { Locator, Page } from '@playwright/test';

export type StartableFormat = 'Print' | 'Digital' | 'Audio';

/**
 * The catalog's start-a-read surface: one form carrying the format toggles, an
 * optional length for this read, and the start date. Everything is scoped to the
 * component element rather than to whichever host opened it.
 */
export class StartReadingSheetPage {
  // The sheet's root. Wait for this to be gone before asserting anything about the
  // page behind it: while a modal is open the rest of the page is aria-hidden, so
  // role-based absence assertions pass whether or not the action ran.
  readonly sheet: Locator;

  /** @param page - The Playwright page the sheet is open on. */
  constructor(public readonly page: Page) {
    this.sheet = page.getByRole('dialog');
  }

  /**
   * Locates a format toggle. The picked one carries aria-pressed, so a spec can
   * assert which format is selected without reading styles.
   * @param format - The format to locate.
   * @returns The format button locator.
   */
  getFormatButton(format: StartableFormat): Locator {
    return this.sheet.getByRole('button', { name: format });
  }

  /**
   * Locates the length field, which is one input relabelled by the picked format:
   * "Pages" for print and digital, "Length" for audio's HH:MM. The length already
   * on record shows as a placeholder rather than a value, so leaving it empty
   * starts the read at the length the app already holds.
   * @param format - The format currently picked, which decides the label.
   * @returns The length input locator.
   */
  getLengthInput(format: StartableFormat): Locator {
    return this.sheet.getByRole('textbox', { name: format === 'Audio' ? 'Length' : 'Pages' });
  }

  /**
   * Locates the submit button, whose aria-label carries the book title.
   * @param title - The book's title.
   * @returns The start button locator.
   */
  getStartButton(title: string): Locator {
    return this.sheet.getByRole('button', { name: `Start reading ${title}` });
  }

  /**
   * Starts the read: picks a format, optionally sets a length, and submits.
   * @param title - The book's title.
   * @param format - The format to read in.
   * @param length - A length for this read: pages as digits, or HH:MM for audio.
   *   Omit to use the length already on record; required when there is none.
   */
  async startAs(title: string, format: StartableFormat, length?: string): Promise<void> {
    await this.getFormatButton(format).click();
    if (length !== undefined) {
      await this.getLengthInput(format).fill(length);
    }
    await this.getStartButton(title).click();
  }
}
