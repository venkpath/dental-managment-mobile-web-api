import {
  Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe,
  UseInterceptors, UploadedFile, BadRequestException, Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Public } from '../../common/decorators/public.decorator.js';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { S3Service } from '../../common/services/s3.service.js';
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
  constructor(
    private readonly clinicService: ClinicService,
    private readonly s3Service: S3Service,
  ) {}

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
    const clinic = await this.clinicService.findOne(user.clinicId);
    // Reads aren't tracked as activity (only writes are), so surface a warning
    // once a clinic has been write-inactive for 30+ days. Suspension hits at 45.
    const baseline = clinic.last_active_at ?? clinic.created_at;
    const daysInactive = Math.floor((Date.now() - baseline.getTime()) / (24 * 60 * 60 * 1000));
    return {
      ...clinic,
      days_inactive: daysInactive,
      inactivity_warning: !clinic.is_suspended && daysInactive >= 30,
      days_until_suspension: clinic.is_suspended ? 0 : Math.max(0, 45 - daysInactive),
    };
  }

  @Get('me/features')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current clinic\'s plan + enabled feature keys' })
  @ApiOkResponse({ description: 'Plan name, limits, and feature flags enabled for this clinic' })
  async getMyFeatures(@CurrentUser() user: RequestUser) {
    return this.clinicService.getFeatures(user.clinicId);
  }

  @Patch('me')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
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

  @Post('me/logo')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upload clinic logo' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Logo uploaded and clinic updated' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadLogo(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, WebP, or SVG images allowed');
    }
    const ext = (extname(file.originalname) || '.jpg').toLowerCase();
    const key = `clinics/${user.clinicId}/logos/${randomUUID()}${ext}`;
    await this.s3Service.upload(key, file.buffer, file.mimetype);
    return this.clinicService.update(user.clinicId, { logo_url: key });
  }

  @Get('logo/:clinicId/:filename')
  @Public()
  @ApiOperation({ summary: 'Serve clinic logo (public)' })
  async serveLogo(
    @Param('clinicId') clinicId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Tight whitelist on path components — these flow into an S3 Key,
    // so reject anything that could escape the clinics/{id}/logos/ prefix.
    if (!/^[A-Za-z0-9-]+$/.test(clinicId) || !/^[A-Za-z0-9._-]+$/.test(filename)) {
      throw new BadRequestException('Invalid path');
    }
    const key = `clinics/${clinicId}/logos/${filename}`;
    const buffer = await this.s3Service.getObject(key);
    if (!buffer) throw new BadRequestException('Logo not found');
    const ext = extname(filename).toLowerCase();
    const contentType =
      ext === '.png'  ? 'image/png'  :
      ext === '.webp' ? 'image/webp' :
      ext === '.svg'  ? 'image/svg+xml' :
                        'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(buffer);
  }
}
