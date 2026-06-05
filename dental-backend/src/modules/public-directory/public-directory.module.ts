import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PublicDirectoryController } from './public-directory.controller.js';
import { ListingVerificationService } from './listing-verification.service.js';
import { ListingOtpService } from './listing-otp.service.js';
import { ClinicReviewsController } from './clinic-reviews.controller.js';
import { ReviewTriggerService } from './review-trigger.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { CommunicationModule } from '../communication/communication.module.js';

@Module({
  imports: [
    CommunicationModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret') || config.get<string>('JWT_SECRET') || 'secret',
        signOptions: { expiresIn: '30m' },
      }),
    }),
  ],
  controllers: [PublicDirectoryController, ClinicReviewsController],
  providers: [PrismaService, PublicDirectoryController, ReviewTriggerService, S3Service, ListingVerificationService, ListingOtpService],
  exports: [ReviewTriggerService],
})
export class PublicDirectoryModule {}
