import { Module } from '@nestjs/common';
import { DataExportController } from './data-export.controller.js';
import { DataExportService } from './data-export.service.js';

@Module({
  controllers: [DataExportController],
  providers: [DataExportService],
})
export class DataExportModule {}
