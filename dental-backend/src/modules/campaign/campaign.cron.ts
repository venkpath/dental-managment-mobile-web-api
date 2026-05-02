import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CampaignService } from './campaign.service.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class CampaignCronService {
  private readonly logger = new Logger(CampaignCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignService: CampaignService,
  ) {}

  // ─── Scheduled Campaign Execution — Every 30 minutes ───

  @Cron('0 */30 * * * *')
  async executeScheduledCampaigns(): Promise<void> {
    this.logger.debug('Checking for scheduled campaigns...');

    try {
      const now = new Date();

      const dueCampaigns = await this.prisma.campaign.findMany({
        where: {
          status: 'scheduled',
          scheduled_at: { lte: now },
        },
        select: { id: true, clinic_id: true, name: true },
      });

      if (dueCampaigns.length === 0) return;

      this.logger.log(`Found ${dueCampaigns.length} scheduled campaigns to execute`);

      for (const campaign of dueCampaigns) {
        try {
          await this.campaignService.execute(campaign.clinic_id, campaign.id);
          this.logger.log(`Scheduled campaign "${campaign.name}" (${campaign.id}) executed successfully`);
        } catch (e) {
          this.logger.error(
            `Failed to execute scheduled campaign ${campaign.id}: ${(e as Error).message}`,
          );
        }
      }
    } catch (e) {
      this.logger.error(`Campaign scheduler cron failed: ${(e as Error).message}`, (e as Error).stack);
    }
  }
}
