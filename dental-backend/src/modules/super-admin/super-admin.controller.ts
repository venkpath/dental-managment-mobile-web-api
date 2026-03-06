import { Body, Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse, ApiConflictResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { CurrentSuperAdmin } from '../../common/decorators/current-super-admin.decorator.js';
import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminAuthService } from './super-admin-auth.service.js';
import { CreateSuperAdminDto, LoginSuperAdminDto } from './dto/index.js';

@ApiTags('Super Admin')
@Controller()
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly superAdminAuthService: SuperAdminAuthService,
  ) {}

  @Public()
  @Post('auth/super-admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Super admin login' })
  @ApiOkResponse({ description: 'Login successful' })
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
}
