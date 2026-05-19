import { Module } from '@nestjs/common';
import { PatientInsightsController } from './patient-insights.controller.js';
import { PatientInsightsService } from './patient-insights.service.js';

@Module({
  controllers: [PatientInsightsController],
  providers: [PatientInsightsService],
  exports: [PatientInsightsService],
})
export class PatientInsightsModule {}
