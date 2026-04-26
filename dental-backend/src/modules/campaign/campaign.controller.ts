import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequireFeature } from '../../common/decorators/require-feature.decorator.js';
import { UserRole } from '../user/dto/index.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { CampaignService } from './campaign.service.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import { QueryCampaignDto } from './dto/query-campaign.dto.js';

@ApiTags('Campaigns')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@RequireFeature('MARKETING_CAMPAIGNS')
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a marketing campaign' })
  @ApiCreatedResponse({ description: 'Campaign created' })
  async create(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.campaignService.create(clinicId, user.sub, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List campaigns' })
  @ApiOkResponse({ description: 'Paginated campaign list' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryCampaignDto,
  ) {
    return this.campaignService.findAll(clinicId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get campaign details' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.findOne(clinicId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a campaign (draft/scheduled only)' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignService.update(clinicId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a campaign' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.delete(clinicId, id);
  }

  @Post(':id/execute')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Execute a campaign — sends messages to all targeted patients' })
  async execute(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.execute(clinicId, id);
  }

  @Post('audience-preview')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Preview audience for a segment (shows count + sample patients)' })
  async audiencePreview(
    @CurrentClinic() clinicId: string,
    @Body() body: { segment_type: string; segment_config?: Record<string, unknown> },
  ) {
    return this.campaignService.getAudiencePreview(clinicId, body.segment_type, body.segment_config);
  }

  @Get('treatment-procedures')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List distinct treatment procedures performed at this clinic, with patient counts (for the By Treatment campaign segment dropdown)' })
  async listTreatmentProcedures(@CurrentClinic() clinicId: string) {
    return this.campaignService.listTreatmentProcedures(clinicId);
  }

  @Get(':id/analytics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get campaign analytics (delivery stats + attribution)' })
  async analytics(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.getAnalytics(clinicId, id);
  }

  // ─── A/B Testing (9.8) ───

  @Post(':id/ab-test')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Execute campaign as A/B test with two template variants' })
  async executeABTest(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { variant_template_id: string; split_percentage?: number },
  ) {
    return this.campaignService.executeABTest(clinicId, id, body.variant_template_id, body.split_percentage);
  }

  @Get(':id/ab-results')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get A/B test results — compare delivery rates between variants' })
  async getABTestResults(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.getABTestResults(clinicId, id);
  }

  // ─── Drip Sequence (9.7) ───

  @Post('drip-sequence')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a multi-step drip campaign (e.g., Day 0 → Day 7 → Day 21)' })
  async createDripSequence(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      name: string;
      channel: string;
      segment_type: string;
      segment_config?: Record<string, unknown>;
      steps: Array<{ template_id: string; delay_days: number }>;
    },
  ) {
    return this.campaignService.createDripSequence(clinicId, user.sub, body);
  }

  @Post(':id/drip-step/:step')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger a specific drip step' })
  async executeDripStep(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('step') step: string,
  ) {
    return this.campaignService.executeDripStep(clinicId, id, parseInt(step, 10));
  }

  // ─── Cost Estimation (9.9) ───

  @Post('estimate-cost')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Estimate campaign cost before execution' })
  async estimateCost(
    @CurrentClinic() clinicId: string,
    @Body() body: { segment_type: string; segment_config?: Record<string, unknown>; channel: string },
  ) {
    return this.campaignService.estimateCost(clinicId, body);
  }

  // ─── Festival Event → Campaign (10.4) ───

  @Post('from-event/:eventId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a campaign from a festival event (one-click with offer details)' })
  async createFromEvent(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.campaignService.createFromFestivalEvent(clinicId, user.sub, eventId);
  }
}
