import { APIRequestContext } from '@playwright/test';

/** The two rulers a session can be measured on, as the backend names them. */
export type LogUnit = 'pages' | 'minutes';

export class ApiClient {
  /** @param request - Playwright's request context, used to call the backend. */
  constructor(private readonly request: APIRequestContext) {}

  /**
   * Creates a book directly via the backend, inferring the author by name.
   * @param title - The book's title.
   * @param author - The author's name; created if it doesn't exist.
   * @param pageCount - Optional page count; required for a completion % to derive.
   * @returns The new book's id.
   */
  async createBook(title: string, author: string, pageCount?: number): Promise<string> {
    const response = await this.request.post('/api/books', {
      data: { title, author, ...(pageCount != null && { page_count: pageCount }) },
    });
    const { id } = (await response.json()) as { id: string };
    for (const format of ['print', 'digital', 'audio']) {
      await this.request.post('/api/editions', {
        data: { book_id: id, format },
      });
    }
    return id;
  }

  /**
   * Starts a reading engagement for a book.
   * @param bookId - The book to start reading.
   * @param editionFormat - The format of the edition to read.
   * @param audioLengthMinutes - Optional total length in minutes; used to set the audio length for
   *   audio reads so completion % can be computed.
   * @returns The new engagement's id.
   */
  async markAsReading(
    bookId: string,
    editionFormat = 'print',
    audioLengthMinutes?: number
  ): Promise<string> {
    const response = await this.request.post('/api/engagements', {
      data: {
        book_id: bookId,
        edition_format: editionFormat,
        ...(audioLengthMinutes != null && { audio_length_minutes: audioLengthMinutes }),
      },
    });
    const { id } = (await response.json()) as { id: string };
    return id;
  }

  /**
   * Where the sheet would prefill "From" -- a session names both its ends, so seeding
   * one that just carries on from the last needs this first.
   * @param engagementId - The engagement to read.
   * @param unit - Which ruler to read the resume point on.
   */
  async getResumePoint(engagementId: string, unit: LogUnit): Promise<number> {
    const field = unit === 'minutes' ? 'resume_from_minute' : 'resume_from_page';
    const response = await this.request.get(`/api/engagements/${engagementId}`);
    return ((await response.json()) as Record<typeof field, number>)[field];
  }

  /**
   * Logs a reading session that carries straight on from where the read stands.
   * @param engagementId - The engagement to log against.
   * @param currentPage - The page reached.
   * @param loggedOn - The date the session happened, yyyy-mm-dd. Defaults to today,
   *   which makes every seeded log share one date -- pass distinct dates when a test
   *   needs to tell its entries apart, since a row is named for its date.
   */
  async logProgress(engagementId: string, currentPage: number, loggedOn?: string): Promise<void> {
    const pageStart = await this.getResumePoint(engagementId, 'pages');
    await this.request.post(`/api/engagements/${engagementId}/progress-logs`, {
      data: {
        page_start: pageStart,
        page_end: currentPage,
        ...(loggedOn != null && { logged_on: loggedOn }),
      },
    });
  }

  /**
   * Logs a listening session that carries straight on from where the read stands.
   * @param engagementId - The engagement to log against.
   * @param currentMinute - The minute position reached.
   * @param loggedOn - The date the session happened, yyyy-mm-dd. Defaults to today.
   */
  async logAudioProgress(
    engagementId: string,
    currentMinute: number,
    loggedOn?: string
  ): Promise<void> {
    const minuteStart = await this.getResumePoint(engagementId, 'minutes');
    await this.request.post(`/api/engagements/${engagementId}/progress-logs`, {
      data: {
        minute_start: minuteStart,
        minute_end: currentMinute,
        ...(loggedOn != null && { logged_on: loggedOn }),
      },
    });
  }

  /**
   * Binds another edition to a read already in progress, which is what makes it
   * multi-format. createBook gives every book an edition in each format, so the
   * format alone is enough to find one.
   * @param engagementId - The read to add the format to.
   * @param editionFormat - The format to add.
   * @param audioLengthMinutes - Total length in minutes. The synthetic audio edition
   *   carries no length of its own, so audio needs one before minutes can be logged.
   */
  async addFormat(
    engagementId: string,
    editionFormat: string,
    audioLengthMinutes?: number
  ): Promise<void> {
    await this.request.post(`/api/engagements/${engagementId}/editions`, {
      data: {
        edition_format: editionFormat,
        ...(audioLengthMinutes != null && { audio_length_minutes: audioLengthMinutes }),
      },
    });
  }

  /**
   * Marks an engagement as finished.
   * @param engagementId - The engagement to finish.
   * @param effectiveOn - The date the read ended, yyyy-mm-dd. Defaults to today. Pass it
   *   when a test needs the finish date to sit on a seeded log rather than on today.
   */
  async markAsFinished(engagementId: string, effectiveOn?: string): Promise<void> {
    await this.request.patch(`/api/engagements/${engagementId}`, {
      data: { status: 'finished', ...(effectiveOn != null && { effective_on: effectiveOn }) },
    });
  }

  /**
   * Marks an engagement as DNF (did not finish).
   * @param engagementId - The engagement to DNF.
   */
  async markAsDnf(engagementId: string): Promise<void> {
    await this.request.patch(`/api/engagements/${engagementId}`, {
      data: { status: 'dnf' },
    });
  }

  /**
   * Patches the start and/or finish date of an engagement.
   * Used in test setup to put the engagement's dates in a known state.
   * @param engagementId - The engagement to patch.
   * @param dates - The dates to apply; each is optional.
   */
  async patchEngagementDates(
    engagementId: string,
    dates: { started_on?: string; finished_on?: string }
  ): Promise<void> {
    await this.request.patch(`/api/engagements/${engagementId}/dates`, {
      data: dates,
    });
  }

  /**
   * Creates or updates the review for a finished or DNF engagement.
   * @param engagementId - The engagement to review.
   * @param rating - Star rating (1.00–5.00 in 0.25 steps), or null for no rating.
   * @param body - Review text, or null.
   */
  async upsertReview(
    engagementId: string,
    rating: number | null,
    body: string | null
  ): Promise<void> {
    await this.request.put(`/api/engagements/${engagementId}/review`, {
      data: { rating, body },
    });
  }
}
