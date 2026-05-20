import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../../common/guards/require-clinic.guard.js';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator.js';
import { InsuranceProvidersService } from '../services/insurance-providers.service.js';

@ApiTags('Insurance — Providers')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@RequireFeature('INSURANCE_MODULE')
@Controller('insurance/providers')
export class InsuranceProvidersController {
  constructor(private readonly providers: InsuranceProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List insurance providers + plans available to the current clinic' })
  @ApiOkResponse({ description: 'Active providers (global + clinic-specific) with their plans' })
  async list(
    @CurrentClinic() clinicId: string,
    @Query('country') country?: string,
    @Query('type') type?: string,
  ) {
    return this.providers.listProviders(clinicId, { country, type });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single insurance provider with all its plans' })
  async get(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.providers.getProvider(clinicId, id);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get a single insurance plan (with provider + procedure codes)' })
  async getPlan(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.providers.getPlan(clinicId, id);
  }
}
