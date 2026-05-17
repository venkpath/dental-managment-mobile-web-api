import { Global, Module } from '@nestjs/common';
import { S3Service } from '../../common/services/s3.service.js';
import { PlatformBillingController } from './platform-billing.controller.js';
import { PlatformBillingSuperAdminController } from './platform-billing-super-admin.controller.js';
import { PlatformBillingService } from './platform-billing.service.js';
import { PlatformInvoicePdfService } from './platform-invoice-pdf.service.js';
import { FeatureModule } from '../feature/feature.module.js';

/**
 * Platform billing — issues SaaS subscription invoices from
 * Smart Dental Desk (Yeshika Enterprises) to clinics on every
 * successful Razorpay charge. Also handles WhatsApp + email delivery
 * and re-send on demand.
 *
 * Marked @Global so PaymentService can call it from the Razorpay webhook
 * without a circular module-import dance.
 */
@Global()
@Module({
  imports: [FeatureModule],
  controllers: [PlatformBillingController, PlatformBillingSuperAdminController],
  providers: [PlatformBillingService, PlatformInvoicePdfService, S3Service],
  exports: [PlatformBillingService],
})
export class PlatformBillingModule {}
