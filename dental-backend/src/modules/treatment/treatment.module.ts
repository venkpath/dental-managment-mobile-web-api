import { Module } from '@nestjs/common';
import { TreatmentController } from './treatment.controller.js';
import { TreatmentService } from './treatment.service.js';
import { PatientInsightsModule } from '../patient-insights/patient-insights.module.js';

@Module({
  imports: [PatientInsightsModule],
  controllers: [TreatmentController],
  providers: [TreatmentService],
  exports: [TreatmentService],
})
export class TreatmentModule {}
