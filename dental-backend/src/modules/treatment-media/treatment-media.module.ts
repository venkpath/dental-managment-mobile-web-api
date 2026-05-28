import { Module } from '@nestjs/common';
import { TreatmentMediaService } from './treatment-media.service.js';
import { TreatmentMediaController } from './treatment-media.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { S3Service } from '../../common/services/s3.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TreatmentMediaController],
  providers: [TreatmentMediaService, S3Service],
  exports: [TreatmentMediaService],
})
export class TreatmentMediaModule {}
