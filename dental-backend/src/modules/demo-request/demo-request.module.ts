import { Module } from '@nestjs/common';
import { DemoRequestController } from './demo-request.controller.js';
import { DemoRequestService } from './demo-request.service.js';

@Module({
  controllers: [DemoRequestController],
  providers: [DemoRequestService],
})
export class DemoRequestModule {}
