import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PatientController } from './patient.controller.js';
import { PatientSelfRegisterController } from './patient-self-register.controller.js';
import { PatientService } from './patient.service.js';
import { PatientImportProducer } from './patient-import.producer.js';
import { PatientImportProcessor } from './patient-import.processor.js';
import { S3Service } from '../../common/services/s3.service.js';
import { QrCodeService } from '../branch/qr-code.service.js';
import { QUEUE_NAMES } from '../../common/queue/queue-names.js';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.PATIENT_IMPORT }),
  ],
  controllers: [PatientController, PatientSelfRegisterController],
  providers: [PatientService, PatientImportProducer, PatientImportProcessor, S3Service, QrCodeService],
  exports: [PatientService],
})
export class PatientModule {}
