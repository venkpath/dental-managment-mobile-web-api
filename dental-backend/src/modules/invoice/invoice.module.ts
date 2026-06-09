import { Module } from '@nestjs/common';
import { InvoiceController, InvoicePublicController } from './invoice.controller.js';
import { InvoiceService } from './invoice.service.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { AutomationModule } from '../automation/automation.module.js';
import { InsuranceModule } from '../insurance/insurance.module.js';
import { PublicDirectoryModule } from '../public-directory/public-directory.module.js';
import { PatientInsightsModule } from '../patient-insights/patient-insights.module.js';

@Module({
  imports: [AutomationModule, InsuranceModule, PublicDirectoryModule, PatientInsightsModule],
  controllers: [InvoiceController, InvoicePublicController],
  providers: [InvoiceService, InvoicePdfService, S3Service],
  exports: [InvoiceService],
})
export class InvoiceModule {}
