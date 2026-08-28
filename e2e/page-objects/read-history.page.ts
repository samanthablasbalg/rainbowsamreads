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
  readonly startDateControl: Locator;
  readonly startDateInput: Locator;
  readonly saveStartDateButton: Locator;
  readonly cancelStartDateButton: Locator;
  readonly finishDateControl: Locator;
  readonly finishDateInput: Locator;
  readonly saveFinishDateButton: Locator;
  readonly cancelFinishDateButton: Locator;
  readonly abandonDateControl: Locator;
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
    // A fine pointer gets the existing button-driven inline editor. A coarse pointer
    // gets a native date input over the formatted date so its picker opens in the
    // original tap. The shared aria-label is the stable boundary for this POM; the
    // editing helpers below branch on the rendered element, not on a project name or
    // viewport size.
    this.startDateControl = page.locator('[aria-label="Edit start date"]');
    // A native date input exposes no implicit `textbox` role, so the date fields go
    // through their label rather than getByRole -- the same as ProgressLogSheetPage.
    this.startDateInput = page.getByLabel('start date', { exact: true });
    this.saveStartDateButton = page.getByRole('button', { name: 'Save start date' });
    this.cancelStartDateButton = page.getByRole('button', { name: 'Cancel start date edit' });
    this.finishDateControl = page.locator('[aria-label="Edit finish date"]');
    this.finishDateInput = page.getByLabel('finish date', { exact: true });
    this.saveFinishDateButton = page.getByRole('button', { name: 'Save finish date' });
    this.cancelFinishDateButton = page.getByRole('button', { name: 'Cancel finish date edit' });
    // A DNF read shows an abandon date where a finished one shows a finish date. The
    // backend derives it, so it renders through the same control as the other dates.
    this.abandonDateControl = page.locator('[aria-label="Edit abandon date"]');
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
   * Locates the visible formatted value for a read date in either pointer mode.
   * @param label - The date's label, e.g. 'start date'.
   * @returns The value container, which also carries its prefix such as 'Started'.
   */
  getDateDisplay(label: 'start date' | 'finish date' | 'abandon date'): Locator {
    return this.page.locator(`[aria-label="Edit ${label}"]`).locator('..');
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
    await this.setDate(this.startDateControl, this.startDateInput, this.saveStartDateButton, date);
  }

  /**
   * Sets the read's finish date through the inline editor. Only a finished read offers
   * this as a correction -- on a read still in progress the same control finishes it.
   * @param date - The date in yyyy-mm-dd format.
   */
  async setFinishDate(date: string): Promise<void> {
    await this.setDate(
      this.finishDateControl,
      this.finishDateInput,
      this.saveFinishDateButton,
      date
    );
  }

  private async setDate(
    control: Locator,
    desktopInput: Locator,
    saveButton: Locator,
    date: string
  ): Promise<void> {
    // The control remains mounted as a type=date input on a coarse pointer. Filling it
    // exercises the same change event as choosing from the native picker; there is no
    // separate app-level approval step. On a fine pointer it starts as the button that
    // opens the unchanged inline editor.
    if ((await control.evaluate((element) => element.tagName)) === 'INPUT') {
      await control.fill(date);
      return;
    }

    await control.click();
    await desktopInput.fill(date);
    await saveButton.click();
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
