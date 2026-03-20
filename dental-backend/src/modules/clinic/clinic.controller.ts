import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
// request.user is set by JwtAuthGuard with camelCase properties
interface RequestUser {
  userId: string;
  clinicId: string;
  role: string;
  branchId: string | null;
}
import { ClinicService } from './clinic.service.js';
import { CreateClinicDto, UpdateClinicDto, UpdateSubscriptionDto } from './dto/index.js';

@ApiTags('Clinics')
@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new clinic (onboarding)' })
  @ApiCreatedResponse({ description: 'Clinic created successfully with 14-day trial' })
  async create(@Body() dto: CreateClinicDto) {
    return this.clinicService.create(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user\'s clinic details' })
  @ApiOkResponse({ description: 'Clinic details' })
  async getMyClinic(@CurrentUser() user: RequestUser) {
    return this.clinicService.findOne(user.clinicId);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current user\'s clinic details' })
  @ApiOkResponse({ description: 'Clinic updated' })
  async updateMyClinic(@CurrentUser() user: RequestUser, @Body() dto: UpdateClinicDto) {
    return this.clinicService.update(user.clinicId, dto);
  }

  @Get()
  @SuperAdmin()
  @ApiOperation({ summary: 'List all clinics (Super Admin)' })
  @ApiOkResponse({ description: 'List of clinics' })
  async findAll() {
    return this.clinicService.findAll();
  }

  @Get(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get a clinic by ID (Super Admin)' })
  @ApiOkResponse({ description: 'Clinic found' })
  @ApiNotFoundResponse({ description: 'Clinic not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicService.findOne(id);
  }

  @Patch(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update clinic details (Super Admin)' })
  @ApiOkResponse({ description: 'Clinic updated successfully' })
  @ApiNotFoundResponse({ description: 'Clinic not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicDto,
  ) {
    return this.clinicService.update(id, dto);
  }

  @Patch(':id/subscription')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update clinic subscription (Super Admin only)' })
  @ApiOkResponse({ description: 'Subscription updated successfully' })
  @ApiNotFoundResponse({ description: 'Clinic not found' })
  async updateSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.clinicService.updateSubscription(id, dto);
  }
}
