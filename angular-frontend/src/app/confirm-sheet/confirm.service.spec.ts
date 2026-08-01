import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmService } from './confirm.service';
import { ConfirmSheetComponent, ConfirmSheetData } from './confirm-sheet';

const baseData: ConfirmSheetData = {
  title: 'Delete Dune?',
  confirmLabel: 'Delete',
};

// `result` is passed at every call site rather than defaulted: an explicit
// `undefined` (the dismissed-without-confirming case) would trigger a default.
function setup(isMobile: boolean, result: boolean | undefined) {
  const mockBottomSheet = { open: vi.fn(() => ({ afterDismissed: () => of(result) })) };
  const mockDialog = { open: vi.fn(() => ({ afterClosed: () => of(result) })) };
  const mockBreakpointObserver = { isMatched: vi.fn().mockReturnValue(isMobile) };

  TestBed.configureTestingModule({
    providers: [
      { provide: MatBottomSheet, useValue: mockBottomSheet },
      { provide: MatDialog, useValue: mockDialog },
      { provide: BreakpointObserver, useValue: mockBreakpointObserver },
    ],
  });

  return {
    service: TestBed.inject(ConfirmService),
    mockBottomSheet,
    mockDialog,
    mockBreakpointObserver,
  };
}

describe('ConfirmService', () => {
  it('opens a bottom sheet on a narrow viewport', () => {
    const { service, mockBottomSheet, mockDialog } = setup(true, true);

    service.confirm(baseData).subscribe();

    expect(mockBottomSheet.open).toHaveBeenCalledOnce();
    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('opens a dialog on a wide viewport', () => {
    const { service, mockBottomSheet, mockDialog } = setup(false, true);

    service.confirm(baseData).subscribe();

    expect(mockDialog.open).toHaveBeenCalledOnce();
    expect(mockBottomSheet.open).not.toHaveBeenCalled();
  });

  it('chooses the host on the phone breakpoint', () => {
    const { service, mockBreakpointObserver } = setup(false, true);

    service.confirm(baseData).subscribe();

    expect(mockBreakpointObserver.isMatched).toHaveBeenCalledWith('(max-width: 599px)');
  });

  it('passes the data and an aria label to the bottom sheet', () => {
    const { service, mockBottomSheet } = setup(true, true);

    service.confirm(baseData).subscribe();

    expect(mockBottomSheet.open).toHaveBeenCalledWith(
      ConfirmSheetComponent,
      expect.objectContaining({ data: baseData, ariaLabel: 'Delete Dune?' }),
    );
  });

  it('passes the data and an aria label to the dialog', () => {
    const { service, mockDialog } = setup(false, true);

    service.confirm(baseData).subscribe();

    expect(mockDialog.open).toHaveBeenCalledWith(
      ConfirmSheetComponent,
      expect.objectContaining({ data: baseData, ariaLabel: 'Delete Dune?' }),
    );
  });

  it('emits true when the sheet is confirmed', () => {
    const { service } = setup(true, true);
    const results: boolean[] = [];

    service.confirm(baseData).subscribe((confirmed) => results.push(confirmed));

    expect(results).toEqual([true]);
  });

  it('emits false when the sheet is dismissed without confirming', () => {
    const { service } = setup(true, undefined);
    const results: boolean[] = [];

    service.confirm(baseData).subscribe((confirmed) => results.push(confirmed));

    expect(results).toEqual([false]);
  });

  it('emits false when the dialog is dismissed without confirming', () => {
    const { service } = setup(false, undefined);
    const results: boolean[] = [];

    service.confirm(baseData).subscribe((confirmed) => results.push(confirmed));

    expect(results).toEqual([false]);
  });
});
