import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { CurrentClinic } from '../../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../../common/guards/require-clinic.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../user/dto/index.js';
import { PrismaService } from '../../../database/prisma.service.js';
import { ClinicFeatureService } from '../../feature/clinic-feature.service.js';

class ToggleDto {
  @IsBoolean()
  enabled!: boolean;
}

/**
 * Clinic-admin facing endpoints for the INSURANCE_MODULE feature flag.
 *
 * Why a dedicated controller (vs. reusing the super-admin feature override
 * endpoints): clinic admins need to flip ONE specific feature themselves
 * without going through support. We keep the surface narrow — they can only
 * toggle this single feature, and only if their plan supports it.
 */
@ApiTags('Insurance — Module Activation')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@Controller('insurance/module')
export class InsuranceModuleController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clinicFeatureService: ClinicFeatureService,
  ) {}

  /**
   * Returns the activation state of the insurance module for the current
   * clinic. UI uses this to render the right state on the settings page:
   *   - `available=false`: plan doesn't include the feature → upgrade prompt
   *   - `available=true, enabled=false`: plan supports it but admin hasn't
   *     enabled it → render the enable toggle
   *   - `available=true, enabled=true`: full UI available
   */
  @Get('status')
  @ApiOperation({ summary: 'Get insurance module availability + activation state' })
  async status(@CurrentClinic() clinicId: string) {
    const feature = await this.prisma.feature.findUnique({
      where: { key: 'INSURANCE_MODULE' },
      select: { id: true },
    });
    if (!feature) {
      // Feature row not seeded — treat as unavailable everywhere.
      return { available: false, enabled: false, reason: 'Feature not registered' };
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { plan_id: true, plan: { select: { name: true } } },
    });
    if (!clinic) throw new NotFoundException('Clinic not found');

    // "Available" = the plan has a PlanFeature row for INSURANCE_MODULE
    // (regardless of is_enabled value). The plan row's existence is what
    // gates whether the clinic admin is allowed to toggle it on.
    const planFeature = clinic.plan_id
      ? await this.prisma.planFeature.findUnique({
          where: { plan_id_feature_id: { plan_id: clinic.plan_id, feature_id: feature.id } },
          select: { is_enabled: true },
        })
      : null;
    const available = !!planFeature;

    // "Enabled" = either the override or (if no override) the plan default
    // resolves to true. We compute via the standard effective-feature view
    // so this matches what FeatureGuard sees.
    const effective = await this.clinicFeatureService.getEffectiveFeatureKeys(clinicId);
    const enabled = effective.includes('INSURANCE_MODULE');

    return {
      available,
      enabled,
      plan_name: clinic.plan?.name ?? null,
    };
  }

  /**
   * Toggle the insurance module on/off for this clinic. Plan must support
   * the feature first (returns 403 otherwise). Implementation just upserts a
   * ClinicFeatureOverride row so the standard FeatureGuard picks it up.
   */
  @Post('toggle')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Enable or disable insurance module for the clinic (admin only)' })
  async toggle(@CurrentClinic() clinicId: string, @Body() dto: ToggleDto) {
    if (typeof dto?.enabled !== 'boolean') {
      throw new BadRequestException('`enabled` boolean required');
    }

    const feature = await this.prisma.feature.findUnique({
      where: { key: 'INSURANCE_MODULE' },
      select: { id: true },
    });
    if (!feature) throw new NotFoundException('INSURANCE_MODULE feature not registered');

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { plan_id: true, plan: { select: { name: true } } },
    });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const planFeature = clinic.plan_id
      ? await this.prisma.planFeature.findUnique({
          where: { plan_id_feature_id: { plan_id: clinic.plan_id, feature_id: feature.id } },
          select: { is_enabled: true },
        })
      : null;
    if (!planFeature) {
      throw new ForbiddenException(
        `The Insurance & EHS module is not included in the ${clinic.plan?.name ?? 'current'} plan. Upgrade to Professional or higher to enable it.`,
      );
    }

    await this.clinicFeatureService.upsertOverrides(clinicId, [
      { feature_id: feature.id, is_enabled: dto.enabled },
    ]);

    return { available: true, enabled: dto.enabled };
  }
}
