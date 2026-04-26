import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AutomationController } from './automation.controller.js';
import { AutomationService } from './automation.service.js';
import { AutomationCronService } from './automation.cron.js';
import { ClinicEventsModule } from '../clinic-events/clinic-events.module.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';

@Module({
  imports: [
    ClinicEventsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.APPOINTMENT_REMINDER }),
  ],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationCronService],
  exports: [AutomationService],
})
export class AutomationModule {}
