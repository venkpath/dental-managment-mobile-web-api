import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller.js';
import { CampaignService } from './campaign.service.js';
import { CampaignCronService } from './campaign.cron.js';
import { PatientInsightsModule } from '../patient-insights/patient-insights.module.js';

@Module({
  imports: [PatientInsightsModule],
  controllers: [CampaignController],
  providers: [CampaignService, CampaignCronService],
  exports: [CampaignService],
})
export class CampaignModule {}
