import { Module } from '@nestjs/common';
import { FeatureController } from './feature.controller.js';
import { FeatureService } from './feature.service.js';
import { ClinicFeatureService } from './clinic-feature.service.js';

@Module({
  controllers: [FeatureController],
  providers: [FeatureService, ClinicFeatureService],
  exports: [FeatureService, ClinicFeatureService],
})
export class FeatureModule {}
