import { Module } from '@nestjs/common';
import { ToothChartController } from './tooth-chart.controller.js';
import { ToothChartService } from './tooth-chart.service.js';

@Module({
  controllers: [ToothChartController],
  providers: [ToothChartService],
  exports: [ToothChartService],
})
export class ToothChartModule {}
