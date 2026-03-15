import { Controller, Get, Res, StreamableFile, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { DataExportService } from './data-export.service.js';

@ApiTags('Data Export')
@Controller('data-export')
@ApiBearerAuth()
export class DataExportController {
  constructor(private readonly dataExportService: DataExportService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export all clinic data', description: 'Exports all clinic data as JSON for compliance/portability' })
  @Header('Content-Type', 'application/json')
  async exportClinicData(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const data = await this.dataExportService.exportClinicData(user.clinic_id);
    const jsonBuffer = Buffer.from(JSON.stringify(data, null, 2));

    res.set({
      'Content-Disposition': `attachment; filename="clinic_data_export_${new Date().toISOString().slice(0, 10)}.json"`,
    });

    return new StreamableFile(jsonBuffer);
  }
}
