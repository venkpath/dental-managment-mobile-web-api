import { Module } from '@nestjs/common';
import { ClinicController } from './clinic.controller.js';
import { ClinicService } from './clinic.service.js';
import { S3Service } from '../../common/services/s3.service.js';

@Module({
  controllers: [ClinicController],
  providers: [ClinicService, S3Service],
  exports: [ClinicService],
})
export class ClinicModule {}
