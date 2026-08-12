import { Locator, Page } from '@playwright/test';

// The review sheet renders identically whether opened as a dialog (fine pointer) or a
// bottom drawer (coarse), so one set of content locators drives both. The switch is on
// pointer type, not viewport width.
export class ReviewSheetPage {
  // The sheet's root. Wait for this to be gone before asserting anything about the page
  // behind it: while a modal is open the rest of the page is aria-hidden, so role-based
  // absence assertions pass whether or not the action ran. Both branches render
  // role="dialog", so this matches either way.
  readonly sheet: Locator;
  // A range input, hence role=slider rather than a pair of selects. The scale runs 0-5 in
  // 0.25 steps so it lines up with the five stars; 0 is the no-rating end, which the app
  // sends as a null rating.
  readonly ratingSlider: Locator;
  // Only present once the body is editable. A review that already has text opens as a
  // static block instead, behind the Edit button.
  readonly reviewTextarea: Locator;
  readonly cancelButton: Locator;

  /** @param page - The Playwright page the sheet is open on. */
  constructor(public readonly page: Page) {
    this.sheet = page.getByRole('dialog');
    this.ratingSlider = page.getByRole('slider', { name: 'Rating' });
    this.reviewTextarea = page.getByRole('textbox', { name: 'Review' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
  }

  /**
   * Locates the static block an existing review's text opens in, before Edit is clicked.
   * @param body - The review text.
   * @returns The static review text locator.
   */
  getReviewText(body: string): Locator {
    return this.sheet.getByText(body);
  }

  /**
   * Locates the button that swaps the static review text for the editor.
   * @param title - The book's title.
   * @returns The edit button locator.
   */
  getEditButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Edit review for ${title}` });
  }

  /**
   * Locates the Save button, whose aria-label carries the book title.
   * @param title - The book's title.
   * @returns The save button locator.
   */
  getSaveButton(title: string): Locator {
    return this.page.getByRole('button', { name: `Save review for ${title}` });
  }

  /**
   * Sets the star rating. Playwright sets a range input's value directly, which is what
   * the control's own change handler reads either way.
   * @param rating - The rating, 0 to 5 in 0.25 steps. 0 clears the rating.
   */
  async setRating(rating: number): Promise<void> {
    await this.ratingSlider.fill(String(rating));
  }

  /**
   * Types the review text. Only valid once the editor is showing.
   * @param body - The review text.
   */
  async enterReview(body: string): Promise<void> {
    await this.reviewTextarea.fill(body);
  }

  /**
   * Swaps an existing review's static text for the editor.
   * @param title - The book's title.
   */
  async editReview(title: string): Promise<void> {
    await this.getEditButton(title).click();
  }

  /**
   * Saves the review.
   * @param title - The book's title, to target the right Save button.
   */
  async save(title: string): Promise<void> {
    await this.getSaveButton(title).click();
  }
}
