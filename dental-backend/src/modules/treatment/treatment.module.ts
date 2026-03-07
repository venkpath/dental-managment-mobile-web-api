import { Module } from '@nestjs/common';
import { TreatmentController } from './treatment.controller.js';
import { TreatmentService } from './treatment.service.js';

@Module({
  controllers: [TreatmentController],
  providers: [TreatmentService],
  exports: [TreatmentService],
})
export class TreatmentModule {}
