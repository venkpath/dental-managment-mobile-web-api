import { Module } from '@nestjs/common';
import { PrescriptionController } from './prescription.controller.js';
import { PrescriptionService } from './prescription.service.js';

@Module({
  controllers: [PrescriptionController],
  providers: [PrescriptionService],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}
