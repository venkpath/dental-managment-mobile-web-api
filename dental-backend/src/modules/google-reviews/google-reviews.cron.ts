import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoogleReviewsService } from './google-reviews.service.js';

@Injectable()
export class GoogleReviewsCronService {
  private readonly logger = new Logger(GoogleReviewsCronService.name);

  constructor(private readonly googleReviews: GoogleReviewsService) {}

  /**
   * Poll all connected clinics for new Google reviews and run the AI
   * auto-reply pipeline. Runs hourly.
   *
   * Google Business Profile API has no webhook for new reviews, so
   * polling is the only option. One-hour cadence balances freshness
   * against API quota (Google's daily quotas are tight by default).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async pollAllClinics(): Promise<void> {
    this.logger.log('[GoogleReviewsCron] Starting hourly review sync...');
    const start = Date.now();
    try {
      const result = await this.googleReviews.syncAllClinics();
      const elapsed = Date.now() - start;
      this.logger.log(
        `[GoogleReviewsCron] Sync complete in ${elapsed}ms — ` +
          `clinics=${result.clinicsProcessed} ` +
          `synced=${result.reviewsSynced} ` +
          `posted=${result.repliesPosted} ` +
          `queued=${result.queuedForApproval}`,
      );
    } catch (err) {
      this.logger.error(
        `[GoogleReviewsCron] Top-level sync failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
