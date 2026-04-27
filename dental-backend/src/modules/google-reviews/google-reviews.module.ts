import { Module } from '@nestjs/common';
import { GoogleReviewsController } from './google-reviews.controller.js';
import { GoogleReviewsService } from './google-reviews.service.js';
import { GoogleReviewsCronService } from './google-reviews.cron.js';
import { GoogleBusinessClient } from './google-business.client.js';

@Module({
  controllers: [GoogleReviewsController],
  providers: [
    GoogleReviewsService,
    GoogleReviewsCronService,
    GoogleBusinessClient,
  ],
  exports: [GoogleReviewsService],
})
export class GoogleReviewsModule {}
