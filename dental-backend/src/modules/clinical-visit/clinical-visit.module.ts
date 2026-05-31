import { Module } from '@nestjs/common';
import { ClinicalVisitController } from './clinical-visit.controller.js';
import { ClinicalVisitService } from './clinical-visit.service.js';
import { PlanLimitModule } from '../../common/services/plan-limit.module.js';
import { PublicDirectoryModule } from '../public-directory/public-directory.module.js';

@Module({
  imports: [PlanLimitModule, PublicDirectoryModule],
  controllers: [ClinicalVisitController],
  providers: [ClinicalVisitService],
  exports: [ClinicalVisitService],
})
export class ClinicalVisitModule {}
