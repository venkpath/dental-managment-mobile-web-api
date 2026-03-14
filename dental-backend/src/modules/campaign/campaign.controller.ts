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
import { UserRole } from '../user/dto/index.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { CampaignService } from './campaign.service.js';
import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import { QueryCampaignDto } from './dto/query-campaign.dto.js';

@ApiTags('Campaigns')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
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

  @Get(':id/analytics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get campaign analytics (delivery stats + attribution)' })
  async analytics(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.campaignService.getAnalytics(clinicId, id);
  }
}
