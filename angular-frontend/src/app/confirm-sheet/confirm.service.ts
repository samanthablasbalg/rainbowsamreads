import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmSheetComponent, ConfirmSheetData } from './confirm-sheet';

const MOBILE_BREAKPOINT = '(max-width: 599px)';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);
  private readonly breakpointObserver = inject(BreakpointObserver);

  /**
   * Asks the user to confirm an action, as a bottom sheet on phones and a dialog
   * everywhere else. Callers never learn which one opened: both hosts' results
   * normalise to one boolean, and anything other than the confirm button —
   * cancel, backdrop, Escape — is a `false`.
   */
  confirm(data: ConfirmSheetData): Observable<boolean> {
    // `autoFocus: 'dialog'` puts focus on the container rather than the first
    // tabbable element, so a stray Enter can't fire the confirm button.
    const result = this.breakpointObserver.isMatched(MOBILE_BREAKPOINT)
      ? this.bottomSheet
          .open<ConfirmSheetComponent, ConfirmSheetData, boolean>(ConfirmSheetComponent, {
            data,
            ariaLabel: data.title,
            autoFocus: 'dialog',
          })
          .afterDismissed()
      : this.dialog
          .open<ConfirmSheetComponent, ConfirmSheetData, boolean>(ConfirmSheetComponent, {
            data,
            ariaLabel: data.title,
            autoFocus: 'dialog',
            width: '440px',
            maxWidth: '92vw',
          })
          .afterClosed();

    return result.pipe(map((confirmed) => confirmed === true));
  }
}
