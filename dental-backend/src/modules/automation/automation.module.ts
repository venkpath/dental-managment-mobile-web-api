import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller.js';
import { AutomationService } from './automation.service.js';
import { AutomationCronService } from './automation.cron.js';

@Module({
  controllers: [AutomationController],
  providers: [AutomationService, AutomationCronService],
  exports: [AutomationService],
})
export class AutomationModule {}
