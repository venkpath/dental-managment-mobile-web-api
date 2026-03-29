import { Module } from '@nestjs/common';
import { PublicBookingController } from './public-booking.controller.js';
import { PrismaService } from '../../database/prisma.service.js';

@Module({
  controllers: [PublicBookingController],
  providers: [PrismaService],
})
export class PublicBookingModule {}
