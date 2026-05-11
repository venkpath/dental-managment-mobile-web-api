import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BranchController } from './branch.controller.js';
import { BranchService } from './branch.service.js';
import { BranchPrescriptionTemplateService } from './branch-prescription-template.service.js';
import { PrescriptionPdfService } from '../prescription/prescription-pdf.service.js';
import { QrCodeService } from './qr-code.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [BranchController],
  providers: [BranchService, BranchPrescriptionTemplateService, PrescriptionPdfService, QrCodeService],
  exports: [BranchService, QrCodeService],
})
export class BranchModule {}
