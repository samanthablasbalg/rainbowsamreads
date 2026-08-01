import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { CurrentlyReadingComponent } from './currently-reading';
import { ProgressLogSheetComponent } from '../progress-log-sheet/progress-log-sheet';
import { ConfirmService } from '../confirm-sheet/confirm.service';

const mockEngagement = {
  id: 'eng-1',
  book: {
    id: 'book-1',
    title: 'Dune',
    authors: [{ id: 'auth-1', name: 'Frank Herbert' }],
    default_page_count: null as number | null,
    default_audio_minutes: 0,
  },
  formats: ['print'] as string[],
  cover_url: null as string | null,
  status: 'reading',
  started_on: '2026-06-01',
  finished_on: null,
  resume_from_page: 0,
  resume_from_minute: 0,
  completion_pct: null as number | null,
};

function findButton(nativeEl: HTMLElement, text: string): HTMLButtonElement {
  return Array.from(nativeEl.querySelectorAll('button')).find((b) =>
    b.textContent?.trim().includes(text),
  ) as HTMLButtonElement;
}

describe('CurrentlyReadingComponent', () => {
  let httpTesting: HttpTestingController;
  let mockBottomSheet: { open: ReturnType<typeof vi.fn> };
  let mockDialog: { open: ReturnType<typeof vi.fn> };
  let mockBreakpointObserver: {
    isMatched: ReturnType<typeof vi.fn>;
    observe: ReturnType<typeof vi.fn>;
  };
  let mockConfirmService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockBottomSheet = { open: vi.fn() };
    mockDialog = { open: vi.fn() };
    mockBreakpointObserver = {
      isMatched: vi.fn().mockReturnValue(false),
      observe: vi.fn().mockReturnValue(of({ matches: true })),
    };
    mockConfirmService = { confirm: vi.fn(() => of(true)) };

    await TestBed.configureTestingModule({
      imports: [CurrentlyReadingComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MatBottomSheet, useValue: mockBottomSheet },
        { provide: MatDialog, useValue: mockDialog },
        { provide: BreakpointObserver, useValue: mockBreakpointObserver },
        { provide: ConfirmService, useValue: mockConfirmService },
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  /** Opens a card's `⋯` menu and returns its items, which Material renders into an
   *  overlay outside the fixture. */
  function openCardMenu(fixture: ComponentFixture<CurrentlyReadingComponent>): HTMLButtonElement[] {
    fixture.nativeElement.querySelector('button[aria-label^="More actions for"]').click();
    fixture.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    return Array.from(overlay.querySelectorAll('button[mat-menu-item]'));
  }

  function menuItem(fixture: ComponentFixture<CurrentlyReadingComponent>, label: string) {
    return openCardMenu(fixture).find((b) => b.getAttribute('aria-label') === label)!;
  }

  afterEach(() => {
    httpTesting.verify();
    // The menu renders into a CDK overlay on document.body, which outlives the
    // fixture - without this it leaks stale mat-menu-items into later tests and
    // into other spec files sharing the environment. Removed straight from the
    // DOM rather than via TestBed.inject, which would instantiate the module and
    // make the next configureTestingModule throw.
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.remove());
  });

  function flushReadingList(data = [mockEngagement]) {
    httpTesting
      .expectOne((req) => req.url === '/api/engagements' && req.params.get('status') === 'reading')
      .flush(data);
  }

  it('shows empty state when there are no engagements', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);

    flushReadingList([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No books in progress');
  });

  it('renders title and authors for each engagement', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);

    flushReadingList();
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('li');
    expect(item.textContent).toContain('Dune');
    expect(item.textContent).toContain('Frank Herbert');
  });

  it('joins multiple authors with a comma', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);

    flushReadingList([
      {
        ...mockEngagement,
        book: {
          ...mockEngagement.book,
          title: 'Good Omens',
          authors: [
            { id: 'auth-1', name: 'Terry Pratchett' },
            { id: 'auth-2', name: 'Neil Gaiman' },
          ],
        },
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('li').textContent).toContain(
      'Terry Pratchett, Neil Gaiman',
    );
  });

  it('renders a cover image when cover_url is set', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);

    flushReadingList([{ ...mockEngagement, cover_url: 'https://example.com/cover.jpg' }]);
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('ng-img')).toBeTruthy();
  });

  it('shows no cover image when cover_url is null', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);

    flushReadingList();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
  });

  it('renders completion % when non-null', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);

    flushReadingList([{ ...mockEngagement, completion_pct: 47 }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('li').textContent).toContain('47%');
  });

  it('omits completion % when null', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);

    flushReadingList();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('li').textContent).not.toContain('%');
  });

  it('renders a Log progress button per engagement', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);

    flushReadingList();
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Log progress')).toBeTruthy();
  });

  describe('format icon', () => {
    it('renders menu_book for a print engagement', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);

      flushReadingList([{ ...mockEngagement, formats: ['print'] }]);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon).toBeTruthy();
      expect(icon.textContent.trim()).toBe('menu_book');
      expect(icon.getAttribute('aria-label')).toBe('Format: print');
    });

    it('renders tablet_mac for a digital engagement', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);

      flushReadingList([{ ...mockEngagement, formats: ['digital'] }]);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon.textContent.trim()).toBe('tablet_mac');
      expect(icon.getAttribute('aria-label')).toBe('Format: digital');
    });

    it('renders headphones for an audio engagement', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);

      flushReadingList([{ ...mockEngagement, formats: ['audio'] }]);
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('mat-icon');
      expect(icon.textContent.trim()).toBe('headphones');
      expect(icon.getAttribute('aria-label')).toBe('Format: audio');
    });

    it('renders no icon when formats is empty', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);

      flushReadingList([{ ...mockEngagement, formats: [] }]);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('mat-icon[aria-label^="Format:"]')).toBeNull();
    });
  });

  it('opens a bottom sheet when Log progress is clicked on a narrow viewport', () => {
    mockBreakpointObserver.isMatched.mockReturnValue(true);
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);
    flushReadingList();
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Log progress').click();

    expect(mockBottomSheet.open).toHaveBeenCalledOnce();
    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('opens a dialog when Log progress is clicked on a wide viewport', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);
    flushReadingList();
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Log progress').click();

    expect(mockDialog.open).toHaveBeenCalledOnce();
    expect(mockBottomSheet.open).not.toHaveBeenCalled();
  });

  it('passes cover, title, resume page, and page count to the dialog on wide viewport', () => {
    const fixture = TestBed.createComponent(CurrentlyReadingComponent);
    flushReadingList([
      {
        ...mockEngagement,
        resume_from_page: 42,
        cover_url: 'https://example.com/cover.jpg',
        book: { ...mockEngagement.book, default_page_count: 412 },
      },
    ]);
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Log progress').click();

    expect(mockDialog.open).toHaveBeenCalledWith(
      ProgressLogSheetComponent,
      expect.objectContaining({
        data: {
          engagementId: 'eng-1',
          title: 'Dune',
          cover_url: 'https://example.com/cover.jpg',
          formats: ['print'],
          resume_from_page: 42,
          resume_from_minute: 0,
          default_page_count: 412,
          default_audio_minutes: 0,
        },
      }),
    );
  });

  it('passes cover, title, resume page, and page count to the bottom sheet on narrow viewport', () => {
    mockBreakpointObserver.isMatched.mockReturnValue(true);

    const fixture = TestBed.createComponent(CurrentlyReadingComponent);
    flushReadingList([
      {
        ...mockEngagement,
        resume_from_page: 42,
        cover_url: 'https://example.com/cover.jpg',
        book: { ...mockEngagement.book, default_page_count: 412 },
      },
    ]);
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Log progress').click();

    expect(mockBottomSheet.open).toHaveBeenCalledWith(
      ProgressLogSheetComponent,
      expect.objectContaining({
        data: {
          engagementId: 'eng-1',
          title: 'Dune',
          cover_url: 'https://example.com/cover.jpg',
          formats: ['print'],
          resume_from_page: 42,
          resume_from_minute: 0,
          default_page_count: 412,
          default_audio_minutes: 0,
        },
      }),
    );
  });

  describe('card menu', () => {
    it('opens a panel that is not hidden', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      fixture.nativeElement.querySelector('button[aria-label^="More actions for"]').click();
      fixture.detectChanges();

      // Material forwards mat-menu's `class` onto the overlay PANEL, so a class that
      // hides it makes the menu unopenable in a browser while leaving the items in
      // the DOM - which is all the other tests here look at.
      const panel = TestBed.inject(OverlayContainer)
        .getContainerElement()
        .querySelector('.mat-mdc-menu-panel');
      expect(panel).toBeTruthy();
      expect(panel!.className).not.toMatch(/\bhidden\b|\binvisible\b/);
    });

    it('offers history, finish, DNF, and delete', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      const labels = openCardMenu(fixture).map((b) => b.getAttribute('aria-label'));
      expect(labels).toEqual([
        'View history for Dune',
        'Mark Dune as finished',
        'Mark Dune as did not finish',
        'Delete Dune',
      ]);
    });

    it('no longer shows history or delete directly on the card', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('li');
      expect(card.querySelector('button[aria-label="Delete Dune"]')).toBeNull();
      expect(card.querySelector('button[aria-label="View history for Dune"]')).toBeNull();
    });
  });

  describe('engagement deletion', () => {
    it('declining the confirm sends no request', () => {
      mockConfirmService.confirm.mockReturnValue(of(false));
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      menuItem(fixture, 'Delete Dune').click();
      fixture.detectChanges();

      httpTesting.expectNone('/api/engagements/eng-1');
    });

    it('confirming calls DELETE then reloads the engagement lists', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      menuItem(fixture, 'Delete Dune').click();
      fixture.detectChanges();

      const req = httpTesting.expectOne('/api/engagements/eng-1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      flushReadingList([]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No books in progress');
    });

    it('asks with the danger tone', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      menuItem(fixture, 'Delete Dune').click();

      expect(mockConfirmService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete this read of "Dune"?',
          confirmLabel: 'Delete',
          tone: 'danger',
        }),
      );

      httpTesting.expectOne('/api/engagements/eng-1').flush(null, {
        status: 204,
        statusText: 'No Content',
      });
      flushReadingList([]);
    });
  });

  describe('marking finished from the menu', () => {
    it('declining the confirm sends no request', () => {
      mockConfirmService.confirm.mockReturnValue(of(false));
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      menuItem(fixture, 'Mark Dune as finished').click();
      fixture.detectChanges();

      httpTesting.expectNone('/api/engagements/eng-1');
    });

    it('confirming patches the status to finished then reloads', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      menuItem(fixture, 'Mark Dune as finished').click();
      fixture.detectChanges();

      const req = httpTesting.expectOne('/api/engagements/eng-1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body.status).toBe('finished');
      req.flush({});

      flushReadingList([]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No books in progress');
    });
  });

  describe('marking DNF from the menu', () => {
    it('declining the confirm sends no request', () => {
      mockConfirmService.confirm.mockReturnValue(of(false));
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      menuItem(fixture, 'Mark Dune as did not finish').click();
      fixture.detectChanges();

      httpTesting.expectNone('/api/engagements/eng-1');
    });

    it('confirming patches the status to dnf then reloads', () => {
      const fixture = TestBed.createComponent(CurrentlyReadingComponent);
      flushReadingList();
      fixture.detectChanges();

      menuItem(fixture, 'Mark Dune as did not finish').click();
      fixture.detectChanges();

      const req = httpTesting.expectOne('/api/engagements/eng-1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body.status).toBe('dnf');
      req.flush({});

      flushReadingList([]);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No books in progress');
    });
  });
});
