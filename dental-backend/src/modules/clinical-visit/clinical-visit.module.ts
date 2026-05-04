import { Module } from '@nestjs/common';
import { ClinicalVisitController } from './clinical-visit.controller.js';
import { ClinicalVisitService } from './clinical-visit.service.js';
import { PlanLimitModule } from '../../common/services/plan-limit.module.js';

@Module({
  imports: [PlanLimitModule],
  controllers: [ClinicalVisitController],
  providers: [ClinicalVisitService],
  exports: [ClinicalVisitService],
})
export class ClinicalVisitModule {}
