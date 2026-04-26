import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppointmentController } from './appointment.controller.js';
import { AppointmentService } from './appointment.service.js';
import { AppointmentNotificationService } from './appointment-notification.service.js';
import { AppointmentReminderProducer } from './appointment-reminder.producer.js';
import { AppointmentReminderProcessor } from './appointment-reminder.processor.js';
import { AppointmentReminderReconciler } from './appointment-reminder.reconciler.js';
import { AutomationModule } from '../automation/automation.module.js';
import { CommunicationModule } from '../communication/communication.module.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';

@Module({
  imports: [
    AutomationModule,
    CommunicationModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.APPOINTMENT_REMINDER }),
  ],
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    AppointmentNotificationService,
    AppointmentReminderProducer,
    AppointmentReminderProcessor,
    AppointmentReminderReconciler,
  ],
  exports: [AppointmentService],
})
export class AppointmentModule {}
