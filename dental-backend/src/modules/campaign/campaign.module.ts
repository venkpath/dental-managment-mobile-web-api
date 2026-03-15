import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller.js';
import { CampaignService } from './campaign.service.js';
import { CampaignCronService } from './campaign.cron.js';

@Module({
  controllers: [CampaignController],
  providers: [CampaignService, CampaignCronService],
  exports: [CampaignService],
})
export class CampaignModule {}
