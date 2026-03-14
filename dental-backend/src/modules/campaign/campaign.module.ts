import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller.js';
import { CampaignService } from './campaign.service.js';

@Module({
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
