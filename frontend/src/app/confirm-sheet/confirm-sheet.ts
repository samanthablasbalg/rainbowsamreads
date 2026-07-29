import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

export interface ConfirmSheetData {
  title: string;
  message?: string;
  confirmLabel: string;
  /** Label for the bail-out button. Defaults to 'Cancel'. */
  cancelLabel?: string;
  /** `danger` is reserved for actions that destroy data (delete). Actions that only
   *  change a book's standing — finish, DNF — are consequential but recoverable by
   *  setting the status back, so they stay on the default tone. */
  tone?: 'default' | 'danger';
}

@Component({
  selector: 'app-confirm-sheet',
  imports: [MatButtonModule],
  templateUrl: './confirm-sheet.html',
})
export class ConfirmSheetComponent {
  protected readonly dialogRef = inject(MatDialogRef, { optional: true });
  protected readonly bottomSheetRef = inject(MatBottomSheetRef, { optional: true });
  protected readonly data: ConfirmSheetData =
    inject<ConfirmSheetData>(MAT_DIALOG_DATA, { optional: true }) ??
    inject<ConfirmSheetData>(MAT_BOTTOM_SHEET_DATA);

  protected confirm(): void {
    this.close(true);
  }

  protected cancel(): void {
    this.close(false);
  }

  private close(result: boolean): void {
    this.dialogRef?.close(result);
    this.bottomSheetRef?.dismiss(result);
  }
}
