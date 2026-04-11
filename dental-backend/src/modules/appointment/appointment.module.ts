import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller.js';
import { AppointmentService } from './appointment.service.js';
import { AppointmentNotificationService } from './appointment-notification.service.js';
import { AutomationModule } from '../automation/automation.module.js';

@Module({
  imports: [AutomationModule],
  controllers: [AppointmentController],
  providers: [AppointmentService, AppointmentNotificationService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
