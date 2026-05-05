import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { DailySummaryCronService } from './daily-summary.cron.js';
import { CommunicationModule } from '../communication/communication.module.js';

@Module({
  imports: [CommunicationModule],
  controllers: [ReportsController],
  providers: [ReportsService, DailySummaryCronService],
  exports: [ReportsService, DailySummaryCronService],
})
export class ReportsModule {}
