import { Global, Module } from '@nestjs/common';
import { PlanLimitService } from './plan-limit.service.js';

@Global()
@Module({
  providers: [PlanLimitService],
  exports: [PlanLimitService],
})
export class PlanLimitModule {}
