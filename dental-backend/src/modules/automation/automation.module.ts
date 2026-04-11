import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller.js';
import { AutomationService } from './automation.service.js';
import { AutomationCronService } from './automation.cron.js';
import { ClinicEventsModule } from '../clinic-events/clinic-events.module.js';

@Module({
  imports: [ClinicEventsModule],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationCronService],
  exports: [AutomationService],
})
export class AutomationModule {}
