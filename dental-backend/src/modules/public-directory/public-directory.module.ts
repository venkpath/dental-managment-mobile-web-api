import { Module } from '@nestjs/common';
import { PublicDirectoryController } from './public-directory.controller.js';
import { ReviewTriggerService } from './review-trigger.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { CommunicationModule } from '../communication/communication.module.js';

@Module({
  imports: [CommunicationModule],
  controllers: [PublicDirectoryController],
  providers: [PrismaService, PublicDirectoryController, ReviewTriggerService, S3Service],
  exports: [ReviewTriggerService],
})
export class PublicDirectoryModule {}
