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
import { resolve } from 'path';
import { existsSync } from 'fs';
import { writeFile, mkdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname } from 'path';
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

  @Get('me/features')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current clinic\'s plan + enabled feature keys' })
  @ApiOkResponse({ description: 'Plan name, limits, and feature flags enabled for this clinic' })
  async getMyFeatures(@CurrentUser() user: RequestUser) {
    return this.clinicService.getFeatures(user.clinicId);
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

  @Post('me/logo')
  @ApiBearerAuth()
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
    const ext = extname(file.originalname) || '.jpg';
    const fileName = `${randomUUID()}${ext}`;
    // Store per-clinic: uploads/logos/{clinicId}/filename
    const dir = `uploads/logos/${user.clinicId}`;
    await mkdir(resolve(process.cwd(), dir), { recursive: true });
    const filePath = `${dir}/${fileName}`;
    await writeFile(resolve(process.cwd(), filePath), file.buffer);
    return this.clinicService.update(user.clinicId, { logo_url: filePath });
  }

  @Get('logo/:clinicId/:filename')
  @Public()
  @ApiOperation({ summary: 'Serve clinic logo (public)' })
  async serveLogo(
    @Param('clinicId') clinicId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Prevent path traversal
    if (clinicId.includes('..') || filename.includes('..') || filename.includes('/')) {
      throw new BadRequestException('Invalid path');
    }
    const uploadsBase = resolve(process.cwd(), 'uploads/logos');
    const filePath = resolve(process.cwd(), 'uploads/logos', clinicId, filename);
    if (!filePath.startsWith(uploadsBase)) throw new BadRequestException('Invalid path');
    if (!existsSync(filePath)) throw new BadRequestException('Logo not found');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filePath);
  }
}
