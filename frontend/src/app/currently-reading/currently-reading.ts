import { Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
import { formatIcon } from '../format-icon';

@Component({
  selector: 'app-currently-reading',
  imports: [NgOptimizedImage, MatButtonModule, MatIconModule, MatProgressBarModule, RouterLink],
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

  protected deleteEngagement(engagement: Engagement): void {
    if (!confirm("Delete this engagement? This can't be undone.")) {
      return;
    }
    this.engagementService.deleteEngagement(engagement.id).subscribe(() => {
      this.engagementService.reloadEngagements();
    });
  }
}
