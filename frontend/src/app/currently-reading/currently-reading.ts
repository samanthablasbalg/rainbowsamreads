import { Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Engagement, EngagementService } from '../engagement.service';
import {
  ProgressLogSheetComponent,
  ProgressLogSheetData,
} from '../progress-log-sheet/progress-log-sheet';
import { ConfirmService } from '../confirm-sheet/confirm.service';
import { ConfirmSheetData } from '../confirm-sheet/confirm-sheet';
import { formatIcon } from '../format-icon';

@Component({
  selector: 'app-currently-reading',
  imports: [
    NgOptimizedImage,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    RouterLink,
  ],
  templateUrl: './currently-reading.html',
})
export class CurrentlyReadingComponent {
  protected readonly formatIcon = formatIcon;

  private readonly engagementService = inject(EngagementService);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly confirmService = inject(ConfirmService);

  protected readonly engagements = toSignal(this.engagementService.engagements('reading'), {
    initialValue: [],
  });

  protected readonly bookCountLabel = computed(() => {
    const count = this.engagements().length;
    return `${count} ${count === 1 ? 'book' : 'books'}`;
  });

  protected coverUrl(engagement: Engagement): string | null {
    return engagement.cover_url;
  }

  protected openLogSheet(engagement: Engagement): void {
    const data: ProgressLogSheetData = {
      engagementId: engagement.id,
      title: engagement.book.title,
      cover_url: this.coverUrl(engagement),
      formats: engagement.formats,
      resume_from_page: engagement.resume_from_page,
      resume_from_minute: engagement.resume_from_minute,
      default_page_count: engagement.book.default_page_count,
      default_audio_minutes: engagement.book.default_audio_minutes,
    };

    if (this.breakpointObserver.isMatched('(max-width: 599px)')) {
      this.bottomSheet.open(ProgressLogSheetComponent, { data, autoFocus: 'dialog' });
    } else {
      this.dialog.open(ProgressLogSheetComponent, {
        data,
        autoFocus: 'dialog',
        width: '440px',
        maxWidth: '92vw',
      });
    }
  }

  protected markFinished(engagement: Engagement): void {
    this.confirmThen(
      {
        title: `Mark "${engagement.book.title}" as finished?`,
        message: "There's no way to undo this in the app yet.",
        confirmLabel: 'Mark finished',
      },
      () => this.engagementService.markFinished(engagement.id),
    );
  }

  protected markDnf(engagement: Engagement): void {
    this.confirmThen(
      {
        title: `Mark "${engagement.book.title}" as did not finish?`,
        message: "There's no way to undo this in the app yet.",
        confirmLabel: 'Mark as DNF',
      },
      () => this.engagementService.markDnf(engagement.id),
    );
  }

  protected deleteEngagement(engagement: Engagement): void {
    this.confirmThen(
      {
        title: `Delete this read of "${engagement.book.title}"?`,
        message: "This will also delete this read's progress logs. This cannot be undone.",
        confirmLabel: 'Delete',
        tone: 'danger',
      },
      () => this.engagementService.deleteEngagement(engagement.id),
    );
  }

  /** Runs `action` only if the confirm sheet comes back confirmed, then reloads the
   *  lists so the row leaves Currently Reading — the same shape the log sheet uses
   *  for its own finish/DNF. */
  private confirmThen(data: ConfirmSheetData, action: () => Observable<unknown>): void {
    this.confirmService.confirm(data).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      action().subscribe(() => {
        this.engagementService.reloadEngagements();
      });
    });
  }
}
