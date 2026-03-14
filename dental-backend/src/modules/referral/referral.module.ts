import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller.js';
import { ReferralService } from './referral.service.js';

@Module({
  controllers: [ReferralController],
  providers: [ReferralService],
  exports: [ReferralService],
})
export class ReferralModule {}
