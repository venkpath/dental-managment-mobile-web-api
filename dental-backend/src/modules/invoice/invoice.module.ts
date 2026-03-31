import { Module } from '@nestjs/common';
import { InvoiceController, InvoicePublicController } from './invoice.controller.js';
import { InvoiceService } from './invoice.service.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';

@Module({
  controllers: [InvoiceController, InvoicePublicController],
  providers: [InvoiceService, InvoicePdfService, S3Service],
  exports: [InvoiceService],
})
export class InvoiceModule {}
