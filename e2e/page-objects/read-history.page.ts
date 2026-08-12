import { Locator, Page } from '@playwright/test';

/**
 * One read's page at /reads/:engagementId: identity, the dates that bound the read, and
 * every session logged against it, newest first.
 *
 * The engagement's own dates edit in place here -- the text swaps for a date input and
 * back. Everything about an individual entry lives in the sheet its row opens, which is
 * EntryEditSheetPage.
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
  readonly errorAlert: Locator;

  /** @param page - The Playwright page to drive the read's page through. */
  constructor(public readonly page: Page) {
    this.backLink = page.getByRole('link', { name: 'Currently reading' });
    this.entries = page.getByRole('list', { name: 'History' });
    this.logProgressButton = page.getByRole('button', { name: 'Log progress', exact: true });
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
   * Locates one entry's row, which is named for the date it was logged on.
   * @param dateLabel - The row's date as rendered, e.g. 'Sun, Jun 15, 2025'.
   * @returns The row locator.
   */
  getEntryRow(dateLabel: string): Locator {
    return this.entries.getByRole('listitem', { name: dateLabel });
  }

  /**
   * Locates the control that opens one entry's edit sheet.
   * @param dateLabel - The row's date as rendered.
   * @returns The edit button locator.
   */
  getEditEntryButton(dateLabel: string): Locator {
    return this.getEntryRow(dateLabel).getByRole('button', {
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
}
