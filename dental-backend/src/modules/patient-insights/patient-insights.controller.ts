import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiOkResponse, ApiHeader, ApiBadRequestResponse } from '@nestjs/swagger';
import { PatientInsightsService } from './patient-insights.service.js';
import { ComputeInsightsDto, QueryInsightsDto, RecordActionDto } from './dto/query-insights.dto.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { RequireFeature } from '../../common/decorators/require-feature.decorator.js';

@ApiTags('Patient Insights')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id' })
@UseGuards(RequireClinicGuard)
@SkipThrottle({ strict: true })
@Controller('patient-insights')
export class PatientInsightsController {
  constructor(private readonly service: PatientInsightsService) {}

  @Post('compute')
  @HttpCode(202)
  @RequireFeature('AI_PATIENT_INSIGHTS')
  @ApiOperation({ summary: 'Trigger insight computation for all patients in clinic/branch' })
  async compute(
    @CurrentClinic() clinicId: string,
    @Query() dto: ComputeInsightsDto,
  ) {
    return this.service.computeForClinic(clinicId, dto.branch_id, 'manual');
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated insight counts for dashboard' })
  @ApiOkResponse({ description: 'Summary with counts per insight type' })
  async getSummary(
    @CurrentClinic() clinicId: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.service.getSummary(clinicId, branchId);
  }

  @Get('list')
  @ApiOperation({ summary: 'Get paginated patient list for an insight type' })
  async getList(
    @CurrentClinic() clinicId: string,
    @Query() dto: QueryInsightsDto,
  ) {
    return this.service.getList(clinicId, dto);
  }

  @Get('eligible')
  @ApiOperation({ summary: 'Count patients eligible for campaign outreach (list rules + cooldown)' })
  async getEligible(
    @CurrentClinic() clinicId: string,
    @Query('type') type: string,
    @Query('branch_id') branchId?: string,
  ) {
    if (type !== 'recall' && type !== 'churn') {
      throw new BadRequestException('Query param "type" must be recall or churn');
    }
    return this.service.getEligibleCount(clinicId, type, branchId);
  }

  @Get('opportunity')
  @RequireFeature('AI_PATIENT_INSIGHTS')
  @ApiOperation({ summary: 'Get potential revenue opportunity from at-risk patients' })
  async getOpportunitySummary(
    @CurrentClinic() clinicId: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.service.getOpportunitySummary(clinicId, branchId);
  }

  @Get('recovered')
  @RequireFeature('AI_PATIENT_INSIGHTS')
  @ApiOperation({ summary: 'Get revenue recovered from at-risk patients who returned (last 90 days)' })
  async getRecoveredSummary(
    @CurrentClinic() clinicId: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.service.getRecoveredSummary(clinicId, branchId);
  }

  @Get('batch/latest')
  @ApiOperation({ summary: 'Get latest computation batch status' })
  async getLatestBatch(@CurrentClinic() clinicId: string) {
    return this.service.getLatestBatch(clinicId);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get computation batch status by ID' })
  async getBatchStatus(
    @CurrentClinic() clinicId: string,
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ) {
    return this.service.getBatchStatus(batchId, clinicId);
  }

  @Get('debug/recall')
  @ApiOperation({
    summary: 'Debug recall list vs badge mismatch (why summary count is 0)',
  })
  async debugRecall(
    @CurrentClinic() clinicId: string,
    @Query('branch_id') branchId?: string,
    @Query('patient_id') patientId?: string,
  ) {
    return this.service.debugRecallVisibility(clinicId, branchId, patientId);
  }

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get insight scores for a single patient' })
  async getPatientScore(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.getPatientScore(clinicId, patientId);
  }

  @Patch('patient/:patientId/action')
  @HttpCode(200)
  @RequireFeature('AI_PATIENT_INSIGHTS')
  @ApiOperation({ summary: 'Record a staff action (contacted / snooze / move_inactive / decline) on a patient insight' })
  async recordAction(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: RecordActionDto,
    @CurrentUser() user?: { sub: string },
  ) {
    return this.service.recordAction(clinicId, patientId, dto, user?.sub);
  }
}
