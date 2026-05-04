import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { DailySummaryCronService } from './daily-summary.cron.js';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, DailySummaryCronService],
  exports: [ReportsService],
})
export class ReportsModule {}
