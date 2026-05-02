import { Module } from '@nestjs/common';
import { ConsentController } from './consent.controller.js';
import { ConsentService } from './consent.service.js';
import { ConsentPdfService } from './consent-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { CommunicationModule } from '../communication/communication.module.js';

@Module({
  imports: [CommunicationModule],
  controllers: [ConsentController],
  providers: [ConsentService, ConsentPdfService, S3Service],
  exports: [ConsentService],
})
export class ConsentModule {}
