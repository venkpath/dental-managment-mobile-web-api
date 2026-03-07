import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiHeader,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Reports')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Get dashboard summary metrics for the clinic' })
  @ApiOkResponse({ description: 'Dashboard summary with today\'s metrics' })
  async getDashboardSummary(@CurrentClinic() clinicId: string) {
    return this.reportsService.getDashboardSummary(clinicId);
  }
}
