import { Module } from '@nestjs/common';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { S3Service } from '../../common/services/s3.service.js';

@Module({
  controllers: [UserController],
  providers: [UserService, S3Service],
  exports: [UserService],
})
export class UserModule {}
