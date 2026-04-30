import { Module } from '@nestjs/common';
import { BranchController } from './branch.controller.js';
import { BranchService } from './branch.service.js';
import { BranchPrescriptionTemplateService } from './branch-prescription-template.service.js';
import { PrescriptionPdfService } from '../prescription/prescription-pdf.service.js';

@Module({
  controllers: [BranchController],
  providers: [BranchService, BranchPrescriptionTemplateService, PrescriptionPdfService],
  exports: [BranchService],
})
export class BranchModule {}
