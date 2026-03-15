import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/index.js';
import { ReferralService } from './referral.service.js';
import { CompleteReferralDto } from './dto/index.js';

@ApiTags('Referrals')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@Controller('referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post('code/:patientId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate or retrieve referral code for a patient' })
  async getOrCreateCode(
    @CurrentClinic() clinicId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.referralService.getOrCreateReferralCode(clinicId, patientId);
  }

  @Patch('code/:codeId/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Deactivate a referral code' })
  async deactivateCode(
    @CurrentClinic() clinicId: string,
    @Param('codeId') codeId: string,
  ) {
    return this.referralService.deactivateCode(clinicId, codeId);
  }

  @Post('complete')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Record a referral completion (when referred patient joins)' })
  async completeReferral(
    @CurrentClinic() clinicId: string,
    @Body() dto: CompleteReferralDto,
  ) {
    return this.referralService.completeReferral(clinicId, dto);
  }

  @Patch(':referralId/credit')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark referral reward as credited' })
  async creditReward(
    @CurrentClinic() clinicId: string,
    @Param('referralId') referralId: string,
  ) {
    return this.referralService.creditReward(clinicId, referralId);
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get referral program statistics' })
  async getStats(@CurrentClinic() clinicId: string) {
    return this.referralService.getStats(clinicId);
  }

  @Get('analytics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get detailed referral analytics — conversion rate, revenue, trends' })
  async getDetailedAnalytics(
    @CurrentClinic() clinicId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.referralService.getDetailedAnalytics(clinicId, startDate, endDate);
  }

  @Get('leaderboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get top referrers leaderboard' })
  async getLeaderboard(
    @CurrentClinic() clinicId: string,
    @Query('limit') limit?: string,
  ) {
    return this.referralService.getLeaderboard(clinicId, limit ? parseInt(limit, 10) : 10);
  }

  @Get('patient/:patientId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all referrals made by a patient' })
  async getPatientReferrals(
    @CurrentClinic() clinicId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.referralService.getPatientReferrals(clinicId, patientId);
  }
}
