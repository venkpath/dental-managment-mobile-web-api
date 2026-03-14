import { Module } from '@nestjs/common';
import { ClinicEventsController } from './clinic-events.controller.js';
import { ClinicEventsService } from './clinic-events.service.js';

@Module({
  controllers: [ClinicEventsController],
  providers: [ClinicEventsService],
  exports: [ClinicEventsService],
})
export class ClinicEventsModule {}
