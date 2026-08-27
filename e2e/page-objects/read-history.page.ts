import { Locator, Page } from '@playwright/test';

/**
 * One read's page at /reads/:engagementId: identity, the dates that bound the read, and
 * every session logged against it, newest first.
 *
 * The engagement's own dates and its length edit in place here -- the text swaps for an
 * input and back. Everything about an individual entry lives in the sheet its row opens,
 * which is EntryEditSheetPage.
 */
export class ReadHistoryPage {
  readonly backLink: Locator;
  readonly entries: Locator;
  readonly logProgressButton: Locator;
  readonly startDateButton: Locator;
  readonly startDateInput: Locator;
  readonly saveStartDateButton: Locator;
  readonly cancelStartDateButton: Locator;
  readonly finishDateButton: Locator;
  readonly finishDateInput: Locator;
  readonly saveFinishDateButton: Locator;
  readonly cancelFinishDateButton: Locator;
  readonly abandonDate: Locator;
  readonly lengthButton: Locator;
  readonly lengthInput: Locator;
  readonly saveLengthButton: Locator;
  readonly cancelLengthButton: Locator;
  readonly progressBar: Locator;
  readonly errorAlert: Locator;

  /** @param page - The Playwright page to drive the read's page through. */
  constructor(public readonly page: Page) {
    this.backLink = page.getByRole('link', { name: 'Currently reading' });
    this.entries = page.getByRole('list', { name: 'History' });
    // Two buttons render this action -- a link on the header line at width, a full-width
    // CTA below it on a phone -- and both stay in the DOM, the wrong one `display: none`.
    // A role match alone finds both, so the visible filter is what picks the one this
    // project's viewport is actually showing.
    this.logProgressButton = page
      .getByRole('button', { name: 'Log progress' })
      .filter({ visible: true });
    this.startDateButton = page.getByRole('button', { name: 'Edit start date' });
    // A native date input exposes no implicit `textbox` role, so the date fields go
    // through their label rather than getByRole -- the same as ProgressLogSheetPage.
    this.startDateInput = page.getByLabel('start date', { exact: true });
    this.saveStartDateButton = page.getByRole('button', { name: 'Save start date' });
    this.cancelStartDateButton = page.getByRole('button', { name: 'Cancel start date edit' });
    this.finishDateButton = page.getByRole('button', { name: 'Edit finish date' });
    this.finishDateInput = page.getByLabel('finish date', { exact: true });
    this.saveFinishDateButton = page.getByRole('button', { name: 'Save finish date' });
    this.cancelFinishDateButton = page.getByRole('button', { name: 'Cancel finish date edit' });
    // A DNF read shows an abandon date where a finished one shows a finish date. The
    // backend derives it, so it renders as the same control the other dates use, only
    // disabled -- still a button, and its text is the date.
    this.abandonDate = page.getByRole('button', { name: 'Edit abandon date' });
    this.lengthButton = page.getByRole('button', { name: 'Edit print length' });
    // Unlike the dates, the length editor is a text input, so it does carry a textbox
    // role. A read bound in two formats shows one length per format, so the control is
    // named for the format it belongs to -- print here, which takes a number.
    this.lengthInput = page.getByRole('textbox', { name: 'print length' });
    this.saveLengthButton = page.getByRole('button', { name: 'Save print length' });
    this.cancelLengthButton = page.getByRole('button', { name: 'Cancel print length edit' });
    this.progressBar = page.getByRole('progressbar');
    this.errorAlert = page.getByRole('alert');
  }

  /**
   * Opens a read's page directly.
   * @param engagementId - The read's engagement id.
   */
  async goto(engagementId: string): Promise<void> {
    await this.page.goto(`/reads/${engagementId}`);
  }

  /**
   * Locates one day's group of entries. The timeline groups sessions by the day they
   * were logged on, and the group's list is what carries the date -- the cards inside it
   * don't repeat it.
   * @param dateLabel - The group's date as rendered, e.g. 'Sun, Jun 15, 2025'.
   * @returns The day group locator.
   */
  getDayGroup(dateLabel: string): Locator {
    return this.entries.getByRole('list', { name: dateLabel });
  }

  /**
   * Locates the control that opens one entry's edit sheet.
   * @param dateLabel - The entry's date as rendered.
   * @returns The edit button locator.
   */
  getEditEntryButton(dateLabel: string): Locator {
    return this.getDayGroup(dateLabel).getByRole('button', {
      name: `Edit entry from ${dateLabel}`,
    });
  }

  /**
   * Opens one entry's edit sheet.
   * @param dateLabel - The row's date as rendered.
   */
  async openEntry(dateLabel: string): Promise<void> {
    await this.getEditEntryButton(dateLabel).click();
  }

  /**
   * Sets the read's start date through the inline editor.
   * @param date - The date in yyyy-mm-dd format.
   */
  async setStartDate(date: string): Promise<void> {
    await this.startDateButton.click();
    await this.startDateInput.fill(date);
    await this.saveStartDateButton.click();
  }

  /**
   * Sets the read's finish date through the inline editor. Only a finished read offers
   * this as a correction -- on a read still in progress the same control finishes it.
   * @param date - The date in yyyy-mm-dd format.
   */
  async setFinishDate(date: string): Promise<void> {
    await this.finishDateButton.click();
    await this.finishDateInput.fill(date);
    await this.saveFinishDateButton.click();
  }

  /**
   * Corrects the read's length through the inline editor.
   * @param length - Pages as a number, or HH:MM for an audio read.
   */
  async setLength(length: string): Promise<void> {
    await this.lengthButton.click();
    await this.lengthInput.fill(length);
    await this.saveLengthButton.click();
  }
}
