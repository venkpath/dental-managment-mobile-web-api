import { Module } from '@nestjs/common';
import { FeatureController } from './feature.controller.js';
import { FeatureService } from './feature.service.js';

@Module({
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
