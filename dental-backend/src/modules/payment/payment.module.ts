import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { SubscriptionReminderService } from './subscription-reminder.service.js';
import { AutomationModule } from '../automation/automation.module.js';
import { FeatureModule } from '../feature/feature.module.js';

@Module({
  imports: [AutomationModule, FeatureModule],
  controllers: [PaymentController],
  providers: [PaymentService, SubscriptionReminderService],
  exports: [PaymentService],
})
export class PaymentModule {}
