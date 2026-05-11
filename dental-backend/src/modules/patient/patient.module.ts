import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PatientController } from './patient.controller.js';
import { PatientSelfRegisterController } from './patient-self-register.controller.js';
import { PatientService } from './patient.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { QrCodeService } from '../branch/qr-code.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [PatientController, PatientSelfRegisterController],
  providers: [PatientService, S3Service, QrCodeService],
  exports: [PatientService],
})
export class PatientModule {}
