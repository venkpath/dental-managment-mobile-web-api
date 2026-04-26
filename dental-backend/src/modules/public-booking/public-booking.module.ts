import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublicBookingController } from './public-booking.controller.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AppointmentReminderProducer } from '../appointment/appointment-reminder.producer.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.APPOINTMENT_REMINDER })],
  controllers: [PublicBookingController],
  providers: [PrismaService, AppointmentReminderProducer],
})
export class PublicBookingModule {}
