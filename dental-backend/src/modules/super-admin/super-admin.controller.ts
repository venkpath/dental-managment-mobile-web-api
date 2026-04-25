import { Body, Controller, Get, Post, Patch, Delete, Param, Query, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse, ApiConflictResponse, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator.js';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { CurrentSuperAdmin } from '../../common/decorators/current-super-admin.decorator.js';
import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminAuthService } from './super-admin-auth.service.js';
import { SuperAdminWhatsAppService } from './super-admin-whatsapp.service.js';
import { CreateSuperAdminDto, LoginSuperAdminDto, OnboardClinicDto } from './dto/index.js';
import { ClinicService } from '../clinic/clinic.service.js';
import { UpdateSubscriptionDto } from '../clinic/dto/index.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { BranchService } from '../branch/branch.service.js';
import { UpdateClinicSettingsDto } from '../communication/dto/update-clinic-settings.dto.js';
import { UpsertAutomationRuleDto } from '../automation/dto/upsert-automation-rule.dto.js';
import { CreateBranchDto } from '../branch/dto/create-branch.dto.js';
import { UpdateBranchDto } from '../branch/dto/update-branch.dto.js';
import { UpdateBranchSchedulingDto } from '../branch/dto/update-branch-scheduling.dto.js';

@ApiTags('Super Admin')
@Controller()
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly superAdminAuthService: SuperAdminAuthService,
    private readonly clinicService: ClinicService,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
    private readonly branchService: BranchService,
    private readonly whatsAppService: SuperAdminWhatsAppService,
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

  @Delete('super-admins/clinics/:id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Delete a clinic and all its data' })
  @ApiOkResponse({ description: 'Clinic deleted successfully' })
  async deleteClinic(@Param('id', ParseUUIDPipe) id: string) {
    return this.superAdminService.deleteClinic(id);
  }

  // ─── Password Change ───

  @Patch('super-admins/me/password')
  @SuperAdmin()
  @ApiOperation({ summary: 'Change super admin password' })
  @ApiOkResponse({ description: 'Password changed successfully' })
  async changePassword(
    @CurrentSuperAdmin() admin: { id: string },
    @Body() dto: { current_password: string; new_password: string },
  ) {
    return this.superAdminService.changePassword(admin.id, dto.current_password, dto.new_password);
  }

  // ─── Audit Log ───

  @Get('super-admins/audit-logs')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get platform-wide audit logs' })
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clinic_id') clinicId?: string,
    @Query('action') action?: string,
  ) {
    return this.superAdminService.getAuditLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      clinicId,
      action,
    });
  }

  // ─── Impersonation ───

  @Post('super-admins/clinics/:id/impersonate')
  @SuperAdmin()
  @ApiOperation({ summary: 'Generate a token to impersonate a clinic admin' })
  @ApiOkResponse({ description: 'Impersonation token' })
  async impersonateClinic(@Param('id', ParseUUIDPipe) id: string) {
    return this.superAdminAuthService.impersonate(id);
  }

  // ─── Clinic Configuration Management ───

  @Get('super-admins/clinics/:id/communication-settings')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get communication settings for a clinic' })
  async getClinicCommunicationSettings(@Param('id', ParseUUIDPipe) id: string) {
    return this.communicationService.getClinicSettings(id);
  }

  @Get('super-admins/clinics/:id/usage')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get current month usage counters and quota status for a clinic' })
  async getClinicUsage(@Param('id', ParseUUIDPipe) id: string) {
    return this.communicationService.getUsage(id);
  }

  @Patch('super-admins/clinics/:id/communication-settings')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update communication settings for a clinic (bypasses feature gate)' })
  async updateClinicCommunicationSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicSettingsDto,
  ) {
    return this.communicationService.updateClinicSettings(id, dto, { skipFeatureCheck: true });
  }

  @Get('super-admins/clinics/:id/automation-rules')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get all automation rules for a clinic' })
  async getClinicAutomationRules(@Param('id', ParseUUIDPipe) id: string) {
    return this.automationService.getAllRules(id);
  }

  @Patch('super-admins/clinics/:id/automation-rules/:ruleType')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update an automation rule for a clinic' })
  async updateClinicAutomationRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleType') ruleType: string,
    @Body() dto: UpsertAutomationRuleDto,
  ) {
    return this.automationService.upsertRule(id, ruleType, dto);
  }

  @Get('super-admins/clinics/:id/branches')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get all branches for a clinic' })
  async getClinicBranches(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchService.findAll(id);
  }

  @Post('super-admins/clinics/:id/branches')
  @SuperAdmin()
  @ApiOperation({ summary: 'Create a new branch for a clinic' })
  async createClinicBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchService.create(id, dto);
  }

  @Patch('super-admins/clinics/:id/branches/:branchId')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update a branch for a clinic' })
  async updateClinicBranch(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(id, branchId, dto);
  }

  @Get('super-admins/clinics/:id/branches/:branchId/scheduling')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get scheduling settings for a branch' })
  async getClinicBranchScheduling(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    return this.branchService.getSchedulingSettings(id, branchId);
  }

  @Patch('super-admins/clinics/:id/branches/:branchId/scheduling')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update scheduling settings for a branch' })
  async updateClinicBranchScheduling(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Body() dto: UpdateBranchSchedulingDto,
  ) {
    return this.branchService.updateSchedulingSettings(id, branchId, dto);
  }

  // ─── Global Settings ───

  @Get('super-admins/global-settings')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get all global settings (key-value pairs)' })
  async getGlobalSettings() {
    return this.superAdminService.getGlobalSettings();
  }

  @Patch('super-admins/global-settings/:key')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update a global setting' })
  async updateGlobalSetting(
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    return this.superAdminService.updateGlobalSetting(key, body.value);
  }

  // ─── Per-Clinic AI Quota ───

  @Patch('super-admins/clinics/:id/ai-quota')
  @SuperAdmin()
  @ApiOperation({ summary: 'Set per-clinic AI quota override (null to use global/default)' })
  async updateClinicAiQuota(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { quota: number | null },
  ) {
    return this.superAdminService.updateClinicAiQuota(id, body.quota);
  }

  @Post('super-admins/clinics/:id/ai-usage/reset')
  @SuperAdmin()
  @ApiOperation({ summary: 'Reset AI usage counter for a clinic' })
  async resetClinicAiUsage(@Param('id', ParseUUIDPipe) id: string) {
    return this.superAdminService.resetClinicAiUsage(id);
  }

  // ─── Platform WhatsApp Inbox (Smart Dental Desk business number) ───

  @Get('super-admins/whatsapp/status')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get platform WhatsApp connection status (env-configured)' })
  getWhatsAppStatus() {
    return this.whatsAppService.getStatus();
  }

  @Get('super-admins/whatsapp/inbox')
  @SuperAdmin()
  @ApiOperation({ summary: 'List platform WhatsApp conversations (grouped by contact phone)' })
  listConversations(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.whatsAppService.getConversations(
      page ? Number(page) : 1,
      limit ? Number(limit) : 30,
    );
  }

  @Get('super-admins/whatsapp/inbox/:phone')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get messages in a platform WhatsApp conversation thread' })
  getConversationMessages(
    @Param('phone') phone: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.whatsAppService.getConversationMessages(
      phone,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Post('super-admins/whatsapp/inbox/:phone/reply')
  @SuperAdmin()
  @ApiOperation({ summary: 'Send a free-form reply within 24hr session window' })
  sendReply(@Param('phone') phone: string, @Body() body: { message: string }) {
    return this.whatsAppService.sendReply(phone, body.message);
  }

  @Post('super-admins/whatsapp/inbox/send-template')
  @SuperAdmin()
  @ApiOperation({ summary: 'Send a template message to start a new platform conversation' })
  sendTemplate(
    @Body()
    body: {
      phone: string;
      template_name: string;
      language_code?: string;
      body_params?: string[];
      contact_name?: string;
    },
  ) {
    return this.whatsAppService.sendTemplate({
      phone: body.phone,
      templateName: body.template_name,
      languageCode: body.language_code,
      bodyParams: body.body_params,
      contactName: body.contact_name,
    });
  }
}
