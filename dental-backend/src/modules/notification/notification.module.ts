import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';
import { NotificationProducer } from './notification.producer.js';
import { NotificationProcessor } from './notification.processor.js';
import { NotificationCronService } from './notification.cron.js';
import { PushDeviceService } from './push-device.service.js';
import { PushNotificationService } from './push-notification.service.js';
import { AppointmentStaffNotificationService } from './appointment-staff-notification.service.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATION })],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationProducer,
    NotificationProcessor,
    NotificationCronService,
    PushDeviceService,
    PushNotificationService,
    AppointmentStaffNotificationService,
  ],
  exports: [
    NotificationService,
    NotificationProducer,
    AppointmentStaffNotificationService,
    PushNotificationService,
  ],
})
export class NotificationModule {}
