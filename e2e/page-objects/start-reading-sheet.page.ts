import { Locator, Page } from '@playwright/test';

export type StartableFormat = 'Print' | 'Digital' | 'Audio';
export type StartableStatus = 'Reading' | 'Finished' | 'DNF';

/**
 * The add-a-read surface: one form carrying the format toggles, an optional length
 * for this read, and its dates. Hosts that offer more than one status (search) put a
 * status-choice step in front of that form; the catalog goes straight to it.
 * Everything is scoped to the component element rather than to whichever host opened
 * it.
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
   * Locates a status choice on the step that precedes the form, shown only when the
   * host offers more than one status.
   * @param title - The book's title.
   * @param status - The status to locate.
   * @returns The status button locator.
   */
  getStatusButton(title: string, status: StartableStatus): Locator {
    return this.sheet.getByRole('button', { name: `Add ${title} as ${status}` });
  }

  /**
   * Locates the start date input, which every status offers. It prefills to today for
   * a read in progress and stays blank for one logged after the fact.
   * @returns The start date input locator.
   */
  getStartDateInput(): Locator {
    return this.sheet.getByLabel('Start date');
  }

  /**
   * Locates the end date input, offered only for a read that is already over. Its
   * label follows how the read ended.
   * @param status - The status being added.
   * @returns The end date input locator.
   */
  getEndDateInput(status: StartableStatus): Locator {
    return this.sheet.getByLabel(status === 'DNF' ? 'Stopped on' : 'Finish date');
  }

  /**
   * Locates the submit button, whose aria-label carries the book title. Only a read
   * in progress is "started"; the others are added.
   * @param title - The book's title.
   * @param status - The status being added; defaults to Reading.
   * @returns The submit button locator.
   */
  getSubmitButton(title: string, status: StartableStatus = 'Reading'): Locator {
    const name = status === 'Reading' ? `Start reading ${title}` : `Add ${title}`;
    return this.sheet.getByRole('button', { name });
  }

  /**
   * Picks a status on the step that precedes the form.
   * @param title - The book's title.
   * @param status - The status to pick.
   */
  async chooseStatus(title: string, status: StartableStatus): Promise<void> {
    await this.getStatusButton(title, status).click();
  }

  /**
   * Dismisses the sheet via its bail-out button, whatever it's labeled.
   * @param label - The button's label; defaults to "Cancel".
   */
  async dismiss(label = 'Cancel'): Promise<void> {
    await this.sheet.getByRole('button', { name: label }).click();
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
    await this.getSubmitButton(title).click();
  }

  /**
   * Adds a read that is already over: picks a format, fills whichever dates are
   * known, and submits. Both dates are optional -- a read you remember finishing but
   * not when takes neither.
   * @param title - The book's title.
   * @param format - The format it was read in.
   * @param status - How the read ended.
   * @param dates.startedOn - The start date, as YYYY-MM-DD.
   * @param dates.endedOn - The finish or stopped-on date, as YYYY-MM-DD.
   */
  async addAs(
    title: string,
    format: StartableFormat,
    status: StartableStatus,
    dates: { startedOn?: string; endedOn?: string } = {}
  ): Promise<void> {
    await this.getFormatButton(format).click();
    if (dates.startedOn !== undefined) {
      await this.getStartDateInput().fill(dates.startedOn);
    }
    if (dates.endedOn !== undefined) {
      await this.getEndDateInput(status).fill(dates.endedOn);
    }
    await this.getSubmitButton(title, status).click();
  }
}
