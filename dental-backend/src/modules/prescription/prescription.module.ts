import { Module } from '@nestjs/common';
import { PrescriptionController, PrescriptionPublicController } from './prescription.controller.js';
import { PrescriptionService } from './prescription.service.js';
import { PrescriptionPdfService } from './prescription-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';

@Module({
  controllers: [PrescriptionController, PrescriptionPublicController],
  providers: [PrescriptionService, PrescriptionPdfService, S3Service],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}
