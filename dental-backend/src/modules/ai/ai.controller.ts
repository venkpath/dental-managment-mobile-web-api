import { Controller, Post, Get, Delete, Body, Req, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import type { Request } from 'express';
import { AiService } from './ai.service.js';
import {
  GenerateClinicalNotesDto,
  GeneratePrescriptionDto,
  GenerateTreatmentPlanDto,
  GenerateRevenueInsightsDto,
  GenerateChartAnalysisDto,
  GenerateAppointmentSummaryDto,
  GenerateCampaignContentDto,
} from './dto/index.js';
import { UserRole } from '../user/dto/create-user.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TrackAiUsage } from '../../common/decorators/track-ai-usage.decorator.js';
import { RequireFeature } from '../../common/decorators/require-feature.decorator.js';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('clinical-notes')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @TrackAiUsage()
  @RequireFeature('AI_CLINICAL_NOTES')
  @ApiOperation({ summary: 'Generate SOAP clinical notes from brief dentist input' })
  async generateClinicalNotes(
    @Req() req: Request,
    @Body() dto: GenerateClinicalNotesDto,
  ) {
    return this.aiService.generateClinicalNotes(req.user!.clinicId, dto);
  }

  @Post('prescription')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @TrackAiUsage()
  @RequireFeature('AI_PRESCRIPTION')
  @ApiOperation({ summary: 'Generate AI-powered dental prescription with safety checks' })
  async generatePrescription(
    @Req() req: Request,
    @Body() dto: GeneratePrescriptionDto,
  ) {
    return this.aiService.generatePrescription(req.user!.clinicId, dto);
  }

  @Post('treatment-plan')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @TrackAiUsage()
  @RequireFeature('AI_TREATMENT_PLAN')
  @ApiOperation({ summary: 'Generate comprehensive treatment plan from dental chart' })
  async generateTreatmentPlan(
    @Req() req: Request,
    @Body() dto: GenerateTreatmentPlanDto,
  ) {
    return this.aiService.generateTreatmentPlan(req.user!.clinicId, dto);
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
    return this.aiService.generateRevenueInsights(req.user!.clinicId, dto);
  }

  @Post('chart-analysis')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @TrackAiUsage()
  @RequireFeature('AI_TREATMENT_PLAN')
  @ApiOperation({ summary: 'AI risk assessment from dental chart conditions' })
  async generateChartAnalysis(
    @Req() req: Request,
    @Body() dto: GenerateChartAnalysisDto,
  ) {
    return this.aiService.generateChartAnalysis(req.user!.clinicId, dto);
  }

  @Post('appointment-summary')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @TrackAiUsage()
  @RequireFeature('AI_CLINICAL_NOTES')
  @ApiOperation({ summary: 'Generate post-visit appointment summary for handoff' })
  async generateAppointmentSummary(
    @Req() req: Request,
    @Body() dto: GenerateAppointmentSummaryDto,
  ) {
    return this.aiService.generateAppointmentSummary(req.user!.clinicId, dto);
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
    return this.aiService.generateCampaignContent(req.user!.clinicId, dto);
  }

  // ─── 8. X-ray Analysis ──────────────────────────────────────

  @Post('xray-analysis')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
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
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'Get AI usage stats for the clinic with per-user and per-type breakdown' })
  async getUsageStats(@Req() req: Request) {
    return this.aiService.getUsageStats(req.user!.clinicId);
  }

  // ─── Stored Insights CRUD ───────────────────────────────────

  @Get('insights')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
  @ApiOperation({ summary: 'List stored AI insights with optional type filter' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async listInsights(
    @Req() req: Request,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.aiService.listInsights(req.user!.clinicId, {
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('insights/:id')
  @Roles(UserRole.ADMIN, UserRole.DENTIST)
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
}
