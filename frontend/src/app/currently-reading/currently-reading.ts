import { Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Engagement, EngagementService } from '../engagement.service';
import {
  ProgressLogSheetComponent,
  ProgressLogSheetData,
} from '../progress-log-sheet/progress-log-sheet';
import { formatIcon } from '../format-icon';

@Component({
  selector: 'app-currently-reading',
  imports: [
    NgOptimizedImage,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  styles: [
    `
      .book-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px;
      }

      .row {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .cover {
        width: 40px;
        height: 60px;
        flex-shrink: 0;
        position: relative;
        border-radius: 4px;
        overflow: hidden;
        background-color: var(--mat-sys-surface-variant);
      }

      .text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .title {
        font-weight: 500;
        color: var(--mat-sys-on-surface);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .author-row {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }

      .author {
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface-variant);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .format-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        color: var(--mat-sys-on-surface-variant);
      }

      .progress-col {
        min-width: 160px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .progress-col mat-progress-bar {
        flex: 1;
      }

      .pct {
        font-size: 0.875rem;
        color: var(--mat-sys-on-surface-variant);
        white-space: nowrap;
      }

      .actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .push-right {
        margin-left: auto;
      }
    `,
  ],
  templateUrl: './currently-reading.html',
})
export class CurrentlyReadingComponent {
  protected readonly formatIcon = formatIcon;

  private readonly engagementService = inject(EngagementService);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);
  private readonly breakpointObserver = inject(BreakpointObserver);

  protected readonly engagements = toSignal(this.engagementService.engagements('reading'), {
    initialValue: [],
  });
  protected readonly showText = toSignal(
    this.breakpointObserver.observe('(min-width: 600px)').pipe(map((r) => r.matches)),
    { initialValue: true },
  );
  protected readonly showBar = toSignal(
    this.breakpointObserver.observe('(min-width: 781px)').pipe(map((r) => r.matches)),
    { initialValue: true },
  );

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

  protected deleteEngagement(engagement: Engagement): void {
    if (!confirm("Delete this engagement? This can't be undone.")) {
      return;
    }
    this.engagementService.deleteEngagement(engagement.id).subscribe(() => {
      this.engagementService.reloadEngagements();
    });
  }
}
