import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PublicBookingController } from './public-booking.controller.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AppointmentReminderProducer } from '../appointment/appointment-reminder.producer.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';
import { S3Service } from '../../common/services/s3.service.js';
import { OtpService } from './otp.service.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.APPOINTMENT_REMINDER }), ConfigModule],
  controllers: [PublicBookingController],
  providers: [PrismaService, AppointmentReminderProducer, S3Service, OtpService],
})
export class PublicBookingModule {}
