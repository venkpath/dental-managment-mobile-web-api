import { Controller, Post, Get, Patch, Delete, Body, Req, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { AiService } from './ai.service.js';
import { AiUsageService } from './ai-usage.service.js';
import {
  GenerateClinicalNotesDto,
  GeneratePrescriptionDto,
  GenerateTreatmentPlanDto,
  GenerateRevenueInsightsDto,
  GenerateChartAnalysisDto,
  GenerateAppointmentSummaryDto,
  GenerateCampaignContentDto,
  UpdateAiSettingsDto,
  CreateAiQuotaApprovalRequestDto,
} from './dto/index.js';
import { UserRole } from '../user/dto/create-user.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TrackAiUsage } from '../../common/decorators/track-ai-usage.decorator.js';
import { RequireFeature } from '../../common/decorators/require-feature.decorator.js';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiUsageService: AiUsageService,
  ) {}

  @Post('clinical-notes')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @TrackAiUsage()
  @RequireFeature('AI_CLINICAL_NOTES')
  @ApiOperation({ summary: 'Generate SOAP clinical notes from brief dentist input' })
  async generateClinicalNotes(
    @Req() req: Request,
    @Body() dto: GenerateClinicalNotesDto,
  ) {
    return this.aiService.generateClinicalNotes(req.user!.clinicId, dto, req.user!.userId);
  }

  @Post('prescription')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @TrackAiUsage()
  @RequireFeature('AI_PRESCRIPTION')
  @ApiOperation({ summary: 'Generate AI-powered dental prescription with safety checks' })
  async generatePrescription(
    @Req() req: Request,
    @Body() dto: GeneratePrescriptionDto,
  ) {
    return this.aiService.generatePrescription(req.user!.clinicId, dto, req.user!.userId);
  }

  @Post('treatment-plan')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @TrackAiUsage()
  @RequireFeature('AI_TREATMENT_PLAN')
  @ApiOperation({ summary: 'Generate comprehensive treatment plan from dental chart' })
  async generateTreatmentPlan(
    @Req() req: Request,
    @Body() dto: GenerateTreatmentPlanDto,
  ) {
    return this.aiService.generateTreatmentPlan(req.user!.clinicId, dto, req.user!.userId);
  }

  @Post('revenue-insights')
  @Roles(UserRole.ADMIN)
  @TrackAiUsage()
  @RequireFeature('AI_CLINICAL_NOTES')
  @ApiOperation({ summary: 'Generate AI-powered revenue and performance insights' })
  async generateRevenueInsights(
    @Req() req: Request,
    @Body() dto: GenerateRevenueInsightsDto,
  ) {
    return this.aiService.generateRevenueInsights(req.user!.clinicId, dto, req.user!.userId);
  }

  @Post('chart-analysis')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @TrackAiUsage()
  @RequireFeature('AI_TREATMENT_PLAN')
  @ApiOperation({ summary: 'AI risk assessment from dental chart conditions' })
  async generateChartAnalysis(
    @Req() req: Request,
    @Body() dto: GenerateChartAnalysisDto,
  ) {
    return this.aiService.generateChartAnalysis(req.user!.clinicId, dto, req.user!.userId);
  }

  @Post('appointment-summary')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @TrackAiUsage()
  @RequireFeature('AI_CLINICAL_NOTES')
  @ApiOperation({ summary: 'Generate post-visit appointment summary for handoff' })
  async generateAppointmentSummary(
    @Req() req: Request,
    @Body() dto: GenerateAppointmentSummaryDto,
  ) {
    return this.aiService.generateAppointmentSummary(req.user!.clinicId, dto, req.user!.userId);
  }

  @Post('campaign-content')
  @Roles(UserRole.ADMIN)
  @TrackAiUsage()
  @RequireFeature('AI_CAMPAIGN_CONTENT')
  @ApiOperation({ summary: 'Auto-generate campaign messages with A/B variants' })
  async generateCampaignContent(
    @Req() req: Request,
    @Body() dto: GenerateCampaignContentDto,
  ) {
    return this.aiService.generateCampaignContent(req.user!.clinicId, dto, req.user!.userId);
  }

  // ─── 8. X-ray Analysis ──────────────────────────────────────

  @Post('xray-analysis')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @TrackAiUsage()
  @RequireFeature('AI_CLINICAL_NOTES')
  @ApiOperation({ summary: 'AI-powered dental X-ray analysis using vision model' })
  async analyzeXray(
    @Req() req: Request,
    @Body() body: { attachment_id: string; notes?: string },
  ) {
    return this.aiService.analyzeXray(req.user!.clinicId, {
      attachmentId: body.attachment_id,
      notes: body.notes,
      userId: req.user!.userId,
    });
  }

  // ─── Usage Stats ─────────────────────────────────────────────

  @Get('usage')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get AI usage stats for the clinic with per-user and per-type breakdown' })
  async getUsageStats(@Req() req: Request) {
    return this.aiService.getUsageStats(req.user!.clinicId);
  }

  // ─── Clinic AI settings (overage toggle) ─────────────────────

  @Patch('settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle paid-plan overage on/off for the clinic' })
  async updateAiSettings(@Req() req: Request, @Body() dto: UpdateAiSettingsDto) {
    return this.aiUsageService.setOverageEnabled(req.user!.clinicId, dto.overage_enabled);
  }

  // ─── Quota approval requests ─────────────────────────────────

  @Post('quota-approval-requests')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Request additional AI quota for the current cycle (super-admin approval)' })
  async createApprovalRequest(
    @Req() req: Request,
    @Body() dto: CreateAiQuotaApprovalRequestDto,
  ) {
    return this.aiUsageService.createApprovalRequest({
      clinicId: req.user!.clinicId,
      userId: req.user!.userId,
      requestedAmount: dto.requested_amount,
      reason: dto.reason || '',
    });
  }

  @Get('quota-approval-requests')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List own AI quota approval requests' })
  async listMyApprovalRequests(@Req() req: Request) {
    return this.aiUsageService.listMyApprovalRequests(req.user!.clinicId);
  }

  // ─── Stored Insights CRUD ───────────────────────────────────

  @Get('insights')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'List stored AI insights with optional type filter' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'patient_id', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async listInsights(
    @Req() req: Request,
    @Query('type') type?: string,
    @Query('patient_id') patientId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.aiService.listInsights(req.user!.clinicId, {
      type,
      patient_id: patientId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('insights/:id')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @ApiOperation({ summary: 'Get a single stored AI insight' })
  async getInsight(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.aiService.getInsight(req.user!.clinicId, id);
  }

  @Delete('insights/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a stored AI insight' })
  async deleteInsight(
    @Req() req: Request,
    @Param('id') id: string,
  ) {
    return this.aiService.deleteInsight(req.user!.clinicId, id);
  }

  @Patch('insights/:id/link')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT)
  @ApiOperation({
    summary:
      'Link a stored AI insight to a saved consultation and/or prescription (audit trail back-link)',
  })
  async linkInsight(
    @Req() req: Request,
    @Param('id') id: string,
    @Body()
    body: {
      consultation_id?: string;
      prescription_id?: string;
    },
  ) {
    return this.aiService.linkInsight(req.user!.clinicId, id, {
      consultation_id: body.consultation_id,
      prescription_id: body.prescription_id,
      reviewed_by: req.user!.userId,
      reviewed_at: new Date().toISOString(),
    });
  }
}

