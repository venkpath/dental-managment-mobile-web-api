import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PublicBookingController } from './public-booking.controller.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AppointmentReminderProducer } from '../appointment/appointment-reminder.producer.js';
import { AppointmentNotificationService } from '../appointment/appointment-notification.service.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { S3Service } from '../../common/services/s3.service.js';
import { OtpService } from './otp.service.js';
import { AutomationModule } from '../automation/automation.module.js';
import { CommunicationModule } from '../communication/communication.module.js';
import { PatientInsightsModule } from '../patient-insights/patient-insights.module.js';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.APPOINTMENT_REMINDER }),
    ConfigModule,
    AutomationModule,
    CommunicationModule,
    PatientInsightsModule,
  ],
  controllers: [PublicBookingController],
  providers: [PrismaService, AppointmentReminderProducer, AppointmentNotificationService, S3Service, OtpService],
})
export class PublicBookingModule {}
