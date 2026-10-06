import { Locator, Page } from '@playwright/test';
import { ConfirmSheetPage } from './confirm-sheet.page';
import { StartReadingSheetPage, StartableFormat } from './start-reading-sheet.page';

export type CatalogStatus = 'Not tracked' | 'To read' | 'Reading' | 'Finished' | 'DNF';

export class CatalogPage {
  /** @param page - The Playwright page to drive the catalog through. */
  constructor(public readonly page: Page) {}

  /** Navigates to the catalog page. */
  async goto(): Promise<void> {
    await this.page.goto('/library/catalog');
  }

  /**
   * Locates a book's row by title. Each row is a listitem labelled for its book.
   * @param title - The library book's title.
   * @returns The row locator.
   */
  getRow(title: string): Locator {
    return this.page.getByRole('listitem', { name: title });
  }

  /**
   * Locates a book's status control within its catalog row.
   * @param title - The library book's title.
   * @param status - The status currently shown by the control.
   * @returns The status button locator for that book.
   */
  getStatusButton(title: string, status: CatalogStatus): Locator {
    return this.getRow(title).getByRole('button', { name: `Status: ${status}` });
  }

  /**
   * Locates an item inside the opened status menu.
   * @param status - The status to pick.
   * @returns The menu item locator.
   */
  getStatusMenuItem(status: Exclude<CatalogStatus, 'Not tracked'>): Locator {
    return this.page.getByRole('menuitem', { name: status });
  }

  /**
   * Picks a status from a catalog row's status menu.
   * @param title - The library book's title.
   * @param from - The status currently shown by the control.
   * @param to - The status to pick.
   */
  async chooseStatus(
    title: string,
    from: CatalogStatus,
    to: Exclude<CatalogStatus, 'Not tracked'>
  ): Promise<void> {
    await this.getStatusButton(title, from).click();
    await this.getStatusMenuItem(to).click();
  }

  /**
   * Marks a library book as currently reading in the given format.
   * Opens the start-reading sheet, then fills and submits it.
   * @param title - The library book's title.
   * @param format - The format to start reading in (defaults to Print).
   * @param length - A length for this read: pages as digits, or HH:MM for audio.
   *   Omit to use the length already on record; required when there is none.
   */
  async markAsReading(
    title: string,
    format: StartableFormat = 'Print',
    length?: string
  ): Promise<void> {
    await this.chooseStatus(title, 'Not tracked', 'Reading');
    await new StartReadingSheetPage(this.page).startAs(title, format, length);
  }

  /**
   * Locates a row's overflow menu trigger.
   * @param title - The library book's title.
   * @returns The menu trigger locator.
   */
  getRowMenuButton(title: string): Locator {
    return this.page.getByRole('button', { name: `More actions for ${title}` });
  }

  /**
   * Locates the "Delete" item inside an opened row menu. The menu renders into an
   * overlay rather than inside the row, so this is located from the page.
   * @param title - The library book's title.
   * @returns The delete menu item locator.
   */
  getDeleteItem(title: string): Locator {
    return this.page.getByRole('menuitem', { name: `Delete ${title}`, exact: true });
  }

  /**
   * Locates the error a refused delete leaves on the row. The catalog is shared, so
   * the backend returns 409 while any user still has a read of the book.
   * @returns The row-level alert locator.
   */
  getDeleteError(): Locator {
    return this.page.getByRole('alert');
  }

  /**
   * Deletes a library book: opens the row menu, chooses Delete, and confirms.
   * @param title - The library book's title.
   */
  async deleteBook(title: string): Promise<void> {
    await this.getRowMenuButton(title).click();
    await this.getDeleteItem(title).click();
    await new ConfirmSheetPage(this.page).getConfirmButton('Delete').click();
  }
}
