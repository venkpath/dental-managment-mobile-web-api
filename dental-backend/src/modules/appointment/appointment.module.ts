import { Module } from '@nestjs/common';
import { AppointmentController } from './appointment.controller.js';
import { AppointmentService } from './appointment.service.js';

@Module({
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
