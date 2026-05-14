import { Module } from '@nestjs/common';
import { TutorialController } from './tutorial.controller.js';
import { SuperAdminTutorialController } from './super-admin-tutorial.controller.js';
import { TutorialService } from './tutorial.service.js';
import { S3Service } from '../../common/services/s3.service.js';

@Module({
  controllers: [TutorialController, SuperAdminTutorialController],
  providers: [TutorialService, S3Service],
  exports: [TutorialService],
})
export class TutorialModule {}
