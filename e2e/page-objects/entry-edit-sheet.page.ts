import { Locator, Page } from '@playwright/test';

/**
 * The sheet one entry's row opens: its date, its end position, and delete. Like every
 * other overlay in the app it renders as a bottom drawer under a coarse pointer and a
 * centred dialog under a fine one, with the same content either way.
 *
 * The end position and Delete are only present on the newest entry of the read -- the
 * backend rejects both on any older one, so the sheet shows a line of explanation
 * instead of a control. Opened from ReadHistoryPage.openEntry.
 */
export class EntryEditSheetPage {
  // The sheet's root. Wait for this to be gone before asserting anything about the page
  // behind it: while a modal is open the rest of the page is aria-hidden, so role-based
  // absence assertions pass whether or not the action ran.
  readonly sheet: Locator;
  readonly dateInput: Locator;
  readonly pageInput: Locator;
  readonly minuteInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly olderEntryNotice: Locator;
  // An entry with no note opens with the textarea collapsed behind this button; one that
  // already has a note shows it as static markdown behind an "Edit note" button instead.
  readonly addNoteButton: Locator;
  readonly noteInput: Locator;

  /** @param page - The Playwright page the sheet is open on. */
  constructor(public readonly page: Page) {
    this.sheet = page.getByRole('dialog');
    // Native date inputs expose no implicit `textbox` role, so this goes through the
    // label rather than getByRole.
    this.dateInput = this.sheet.getByLabel('Log date');
    this.pageInput = this.sheet.getByLabel('Ended at page');
    this.minuteInput = this.sheet.getByLabel('Ended at', { exact: true });
    this.saveButton = this.sheet.getByRole('button', { name: 'Save', exact: true });
    this.cancelButton = this.sheet.getByRole('button', { name: 'Cancel', exact: true });
    this.olderEntryNotice = this.sheet.getByText(/Only the most recent session/);
    this.addNoteButton = this.sheet.getByRole('button', { name: '+ Add a note' });
    this.noteInput = this.sheet.getByRole('textbox', { name: 'Note' });
  }

  /**
   * Locates the Delete button, whose aria-label carries the entry's date.
   * @param dateLabel - The entry's date as rendered.
   * @returns The delete button locator.
   */
  getDeleteButton(dateLabel: string): Locator {
    return this.sheet.getByRole('button', { name: `Delete entry from ${dateLabel}` });
  }

  /**
   * Sets the date this entry was logged on.
   * @param date - The date in yyyy-mm-dd format.
   */
  async setDate(date: string): Promise<void> {
    await this.dateInput.fill(date);
  }

  /**
   * Sets the page this entry was read up to.
   * @param page - The page reached.
   */
  async setEndPage(page: number): Promise<void> {
    await this.pageInput.fill(String(page));
  }

  /**
   * Reveals the note textarea and writes a note into it.
   * @param note - The note's text, in markdown.
   */
  async addNote(note: string): Promise<void> {
    await this.addNoteButton.click();
    await this.noteInput.fill(note);
  }

  /** Saves the edit. */
  async save(): Promise<void> {
    await this.saveButton.click();
  }
}
