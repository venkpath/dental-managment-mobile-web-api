import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiHeader,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service.js';
import {
  RevenueQueryDto,
  AppointmentAnalyticsQueryDto,
  DentistPerformanceQueryDto,
  PatientAnalyticsQueryDto,
  TreatmentAnalyticsQueryDto,
} from './dto/index.js';
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

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue report with date range and optional filters' })
  @ApiOkResponse({ description: 'Revenue report with financial metrics' })
  async getRevenueReport(
    @CurrentClinic() clinicId: string,
    @Query() query: RevenueQueryDto,
  ) {
    return this.reportsService.getRevenueReport(clinicId, query);
  }

  @Get('appointments')
  @ApiOperation({ summary: 'Get appointment analytics with status breakdown' })
  @ApiOkResponse({ description: 'Appointment analytics with status counts' })
  async getAppointmentAnalytics(
    @CurrentClinic() clinicId: string,
    @Query() query: AppointmentAnalyticsQueryDto,
  ) {
    return this.reportsService.getAppointmentAnalytics(clinicId, query);
  }

  @Get('dentist-performance')
  @ApiOperation({ summary: 'Get performance metrics per dentist' })
  @ApiOkResponse({ description: 'List of dentists with their performance metrics' })
  async getDentistPerformance(
    @CurrentClinic() clinicId: string,
    @Query() query: DentistPerformanceQueryDto,
  ) {
    return this.reportsService.getDentistPerformance(clinicId, query);
  }

  @Get('patients')
  @ApiOperation({ summary: 'Get patient analytics with new vs returning breakdown' })
  @ApiOkResponse({ description: 'Patient analytics with registration and visit metrics' })
  async getPatientAnalytics(
    @CurrentClinic() clinicId: string,
    @Query() query: PatientAnalyticsQueryDto,
  ) {
    return this.reportsService.getPatientAnalytics(clinicId, query);
  }

  @Get('treatments')
  @ApiOperation({ summary: 'Get treatment analytics with procedure breakdown' })
  @ApiOkResponse({ description: 'Treatment analytics with most common procedures' })
  async getTreatmentAnalytics(
    @CurrentClinic() clinicId: string,
    @Query() query: TreatmentAnalyticsQueryDto,
  ) {
    return this.reportsService.getTreatmentAnalytics(clinicId, query);
  }

  @Get('inventory-alerts')
  @ApiOperation({ summary: 'Get inventory items at or below reorder level' })
  @ApiOkResponse({ description: 'List of low-stock inventory items' })
  async getInventoryAlerts(
    @CurrentClinic() clinicId: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.reportsService.getInventoryAlerts(clinicId, branchId);
  }
}
