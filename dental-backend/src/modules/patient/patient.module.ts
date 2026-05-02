import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PatientController } from './patient.controller.js';
import { PatientService } from './patient.service.js';
import { S3Service } from '../../common/services/s3.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [PatientController],
  providers: [PatientService, S3Service],
  exports: [PatientService],
})
export class PatientModule {}
