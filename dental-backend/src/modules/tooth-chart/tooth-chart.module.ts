import { Module } from '@nestjs/common';
import { ToothChartController } from './tooth-chart.controller.js';
import { ToothChartService } from './tooth-chart.service.js';
import { S3Service } from '../../common/services/s3.service.js';

@Module({
  controllers: [ToothChartController],
  providers: [ToothChartService, S3Service],
  exports: [ToothChartService],
})
export class ToothChartModule {}
