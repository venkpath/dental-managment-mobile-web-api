import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import {
  CreateMembershipEnrollmentDto,
  CreateMembershipPlanDto,
  CreateMembershipUsageDto,
  QueryMembershipEnrollmentsDto,
  UpdateMembershipEnrollmentDto,
  UpdateMembershipPlanDto,
} from './dto/index.js';
import { MembershipService } from './membership.service.js';

@ApiTags('Memberships')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('memberships')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post('plans')
  @ApiOperation({ summary: 'Create a configurable patient membership plan' })
  @ApiCreatedResponse({ description: 'Membership plan created successfully' })
  async createPlan(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateMembershipPlanDto,
  ) {
    return this.membershipService.createPlan(clinicId, dto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List membership plans for the current clinic' })
  @ApiOkResponse({ description: 'Membership plans fetched successfully' })
  async findAllPlans(@CurrentClinic() clinicId: string) {
    return this.membershipService.findAllPlans(clinicId);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a membership plan and its configurable benefits' })
  @ApiOkResponse({ description: 'Membership plan updated successfully' })
  async updatePlan(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipPlanDto,
  ) {
    return this.membershipService.updatePlan(clinicId, id, dto);
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'List membership enrollments for the current clinic' })
  @ApiOkResponse({ description: 'Membership enrollments fetched successfully' })
  async listEnrollments(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryMembershipEnrollmentsDto,
  ) {
    return this.membershipService.listEnrollments(clinicId, query);
  }

  @Post('enrollments')
  @ApiOperation({ summary: 'Enroll a patient or family group into a membership plan' })
  @ApiCreatedResponse({ description: 'Membership enrollment created successfully' })
  async createEnrollment(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateMembershipEnrollmentDto,
  ) {
    return this.membershipService.createEnrollment(clinicId, dto);
  }

  @Patch('enrollments/:id')
  @ApiOperation({ summary: 'Update membership enrollment status or validity' })
  @ApiOkResponse({ description: 'Membership enrollment updated successfully' })
  async updateEnrollment(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipEnrollmentDto,
  ) {
    return this.membershipService.updateEnrollment(clinicId, id, dto);
  }

  @Post('enrollments/:id/usages')
  @ApiOperation({ summary: 'Record membership benefit usage for a covered patient' })
  @ApiCreatedResponse({ description: 'Membership benefit usage recorded successfully' })
  async recordUsage(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMembershipUsageDto,
  ) {
    return this.membershipService.recordUsage(clinicId, id, dto);
  }

  @Get('patients/:patientId/summary')
  @ApiOperation({ summary: 'Get membership summary for a patient, including family enrollments and benefit balances' })
  @ApiOkResponse({ description: 'Membership summary fetched successfully' })
  async getPatientSummary(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.membershipService.getPatientSummary(clinicId, patientId);
  }
}