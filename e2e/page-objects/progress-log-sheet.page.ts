import { Locator, Page } from '@playwright/test';

// The progress-log sheet renders identically whether opened as a dialog (fine
// pointer) or a bottom drawer (coarse), so one set of content locators drives both.
// The switch is on pointer type, not viewport width. Instantiated against the same
// page as the currently-reading POM.
export class ProgressLogSheetPage {
  // The sheet's root. Wait for this to be gone before asserting anything about the
  // page behind it: while a modal is open the rest of the page is aria-hidden, so
  // role-based absence assertions pass whether or not the action ran. Both branches
  // render role="dialog", so this matches either way.
  readonly sheet: Locator;
  readonly pageInput: Locator;
  readonly minuteInput: Locator;
  readonly cancelButton: Locator;
  readonly dateToggleButton: Locator;
  readonly dateInput: Locator;

  /** @param page - The Playwright page the sheet is open on. */
  constructor(public readonly page: Page) {
    this.sheet = page.getByRole('dialog');
    this.pageInput = page.getByPlaceholder('---', { exact: true });
    this.minuteInput = page.getByPlaceholder('--:--', { exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.dateToggleButton = page.getByRole('button', { name: 'Pick a date' });
    // A native date input exposes no implicit `textbox` role, so this goes through
    // the label rather than getByRole.
    this.dateInput = page.getByLabel('Log date');
  }

  /**
   * Locates the Save button, whose aria-label carries the book title.
   * @param title - The book's title.
   * @returns The save button locator.
   */
  getSaveButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Save progress for ${title}` });
  }

  /**
   * Locates the static "From" value showing the position last logged before this sheet opened.
   * @param value - The expected displayed value, e.g. '100' or '01:15'.
   * @returns The From-value locator.
   */
  getFromDisplay(value: string): Locator {
    return this.page.getByText(value, { exact: true });
  }

  /**
   * Locates the "of N" cap beside the position field, which reads the read's own
   * length -- a length override, where one was set, rather than the book default.
   * @param value - The expected displayed length, e.g. '500' or '10:00'.
   * @returns The cap locator.
   */
  getMaxDisplay(value: string): Locator {
    return this.page.getByText(`of ${value}`, { exact: true });
  }

  /**
   * Types a page number into the current-page field.
   * @param page - The page reached.
   */
  async enterPage(page: number): Promise<void> {
    await this.pageInput.fill(String(page));
  }

  /**
   * Types a position into the HH:MM field for audio reads.
   * @param hhmm - The position in HH:MM format.
   */
  async enterMinute(hhmm: string): Promise<void> {
    await this.minuteInput.fill(hhmm);
  }

  /**
   * Saves the logged progress.
   * @param title - The book's title, to target the right Save button.
   */
  async save(title: string): Promise<void> {
    await this.getSaveButton(title).click();
  }

  /** Reveals the log-date input for backdating a log to a past day. */
  async openDatePicker(): Promise<void> {
    await this.dateToggleButton.click();
  }

  /**
   * Sets the log date, for backdating a log to a past day.
   * @param date - The date in yyyy-mm-dd format.
   */
  async setDate(date: string): Promise<void> {
    await this.dateInput.fill(date);
  }
}
