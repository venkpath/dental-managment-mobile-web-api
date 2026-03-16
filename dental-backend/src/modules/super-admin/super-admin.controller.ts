import { Body, Controller, Get, Post, Patch, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse, ApiConflictResponse, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator.js';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { CurrentSuperAdmin } from '../../common/decorators/current-super-admin.decorator.js';
import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminAuthService } from './super-admin-auth.service.js';
import { CreateSuperAdminDto, LoginSuperAdminDto, OnboardClinicDto } from './dto/index.js';
import { ClinicService } from '../clinic/clinic.service.js';
import { UpdateSubscriptionDto } from '../clinic/dto/index.js';

@ApiTags('Super Admin')
@Controller()
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly superAdminAuthService: SuperAdminAuthService,
    private readonly clinicService: ClinicService,
  ) {}

  // ─── Auth ───

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('auth/super-admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super admin login' })
  @ApiOkResponse({ description: 'Login successful' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Body() dto: LoginSuperAdminDto) {
    return this.superAdminAuthService.login(dto);
  }

  @Post('super-admins')
  @SuperAdmin()
  @ApiOperation({ summary: 'Create a new super admin' })
  @ApiCreatedResponse({ description: 'Super admin created successfully' })
  @ApiConflictResponse({ description: 'Email already exists' })
  async create(@Body() dto: CreateSuperAdminDto) {
    return this.superAdminService.create(dto);
  }

  @Get('super-admins/me')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get current super admin profile' })
  @ApiOkResponse({ description: 'Super admin profile' })
  async getProfile(@CurrentSuperAdmin() admin: { id: string }) {
    return this.superAdminService.findOne(admin.id);
  }

  // ─── Dashboard ───

  @Get('super-admins/dashboard/stats')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get platform dashboard statistics' })
  async getDashboardStats() {
    return this.superAdminService.getDashboardStats();
  }

  // ─── Clinics Management ───

  @Get('super-admins/clinics')
  @SuperAdmin()
  @ApiOperation({ summary: 'List all clinics with pagination, filtering, and search' })
  async listClinics(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.superAdminService.listClinics({
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('super-admins/clinics/:id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get detailed clinic info (users, branches, stats)' })
  async getClinicDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.superAdminService.getClinicDetail(id);
  }

  @Patch('super-admins/clinics/:id/subscription')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update clinic subscription (plan, status, trial)' })
  async updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.clinicService.updateSubscription(id, dto);
  }

  // ─── Onboard Clinic ───

  @Post('super-admins/clinics/onboard')
  @SuperAdmin()
  @ApiOperation({ summary: 'Manually onboard a new clinic with admin user' })
  @ApiCreatedResponse({ description: 'Clinic onboarded successfully' })
  async onboardClinic(@Body() dto: OnboardClinicDto) {
    return this.superAdminService.onboardClinic(dto);
  }
}
