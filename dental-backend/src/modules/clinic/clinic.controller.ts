import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe,
  UseInterceptors, UploadedFile, BadRequestException, Res, Logger,
} from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { get as httpsGet } from 'https';
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
import { extname, join } from 'path';
import { readFile } from 'fs/promises';
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
class DeleteGalleryImageDto {
  @IsString()
  @IsNotEmpty()
  key!: string;
}

import { ClinicService } from './clinic.service.js';
import { CreateClinicDto, UpdateClinicDto, UpdateSubscriptionDto } from './dto/index.js';
import { PrismaService } from '../../database/prisma.service.js';

@ApiTags('Clinics')
@Controller('clinics')
export class ClinicController {
  private readonly logger = new Logger(ClinicController.name);

  constructor(
    private readonly clinicService: ClinicService,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new clinic (onboarding)' })
  @ApiCreatedResponse({ description: 'Clinic created successfully with 14-day trial' })
  async create(@Body() dto: CreateClinicDto) {
    return this.clinicService.create(dto);
  }

  // ─── Pincode lookup (public) ────────────────────────────────────────────────
  // In-memory cache — pincodes never change so a process-lifetime cache is fine.
  private static readonly pincodeCache = new Map<string, { state: string; country: string } | null>();

  @Get('pincode/:pin')
  @Public()
  @ApiOperation({ summary: 'Look up state/country from a 6-digit Indian pincode' })
  @ApiOkResponse({ description: 'state and country, or null if not found' })
  async lookupPincode(@Param('pin') pin: string) {
    if (!/^\d{6}$/.test(pin)) throw new BadRequestException('Pincode must be exactly 6 digits');

    if (ClinicController.pincodeCache.has(pin)) {
      return ClinicController.pincodeCache.get(pin) ?? null;
    }

    // Fetch from India Post API — uses a scoped agent that skips cert validation
    // because the govt API has a frequently expired certificate.
    const result = await new Promise<{ state: string; country: string } | null>((resolve) => {
      const url = `https://api.postalpincode.in/pincode/${pin}`;
      const req = httpsGet(url, { rejectUnauthorized: false }, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(body) as Array<{
              Status: string;
              PostOffice?: Array<{ State: string; Country: string }>;
            }>;
            if (json[0]?.Status === 'Success' && json[0].PostOffice?.length) {
              const { State, Country } = json[0].PostOffice[0];
              resolve({ state: State, country: Country });
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(6000, () => { req.destroy(); resolve(null); });
    });

    ClinicController.pincodeCache.set(pin, result);
    return result;
  }

  @Get('me/onboarding-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get clinic profile completion checklist and percentage' })
  @ApiOkResponse({ description: 'Onboarding checklist with percentage' })
  async getOnboardingStatus(@CurrentUser() user: RequestUser) {
    return this.clinicService.getOnboardingStatus(user.clinicId);
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

  // ── Gallery upload / list / delete ──────────────────────────────────

  @Get('me/gallery')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get gallery images (with presigned URLs) for the authenticated clinic' })
  async getGallery(@CurrentUser() user: RequestUser) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { gallery_images: true },
    });
    const keys: string[] = this.parseGalleryKeys(clinic?.gallery_images);
    const signed_urls = await Promise.all(
      keys.map((k) => this.s3Service.getSignedUrl(k).catch(() => null)),
    );
    return { keys, signed_urls };
  }

  @Post('me/gallery')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Upload a gallery image (max 5 per clinic)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadGalleryImage(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, or WebP images allowed');
    }
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { gallery_images: true },
    });
    const keys: string[] = this.parseGalleryKeys(clinic?.gallery_images);
    if (keys.length >= 5) throw new BadRequestException('Maximum 5 gallery images allowed');

    const ext = (extname(file.originalname) || '.jpg').toLowerCase();
    const key = `clinics/${user.clinicId}/gallery/${randomUUID()}${ext}`;
    await this.s3Service.upload(key, file.buffer, file.mimetype);

    const updatedKeys = [...keys, key];
    await this.clinicService.update(user.clinicId, { gallery_images: JSON.stringify(updatedKeys) });

    const signed_urls = await Promise.all(
      updatedKeys.map((k) => this.s3Service.getSignedUrl(k).catch(() => null)),
    );
    return { keys: updatedKeys, signed_urls };
  }

  @Delete('me/gallery')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a gallery image by S3 key' })
  async deleteGalleryImage(
    @CurrentUser() user: RequestUser,
    @Body() body: DeleteGalleryImageDto,
  ) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: user.clinicId },
      select: { gallery_images: true },
    });
    const keys: string[] = this.parseGalleryKeys(clinic?.gallery_images);
    if (!keys.includes(body.key)) throw new BadRequestException('Image not found in gallery');

    // Delete from S3 (fire and forget — don't block if it fails)
    this.s3Service.delete(body.key).catch((e: unknown) => {
      this.logger.warn(`Failed to delete gallery image ${body.key}: ${String(e)}`);
    });

    const updatedKeys = keys.filter((k) => k !== body.key);
    await this.clinicService.update(user.clinicId, {
      gallery_images: updatedKeys.length ? JSON.stringify(updatedKeys) : undefined,
    });

    const signed_urls = await Promise.all(
      updatedKeys.map((k) => this.s3Service.getSignedUrl(k).catch(() => null)),
    );
    return { keys: updatedKeys, signed_urls };
  }

  private parseGalleryKeys(raw: string | null | undefined): string[] {
    if (!raw) return [];
    try { return JSON.parse(raw) as string[]; } catch { return []; }
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
    let buffer = await this.s3Service.getObject(key);

    if (!buffer) {
      // Pre-S3 migration: files may still live on local disk
      const diskPath = join(process.cwd(), 'uploads', 'logos', clinicId, filename);
      try {
        buffer = await readFile(diskPath);
        // Lazily migrate to S3 so the next request hits S3 directly
        const ext2 = extname(filename).toLowerCase();
        const mime =
          ext2 === '.png'  ? 'image/png'  :
          ext2 === '.webp' ? 'image/webp' :
          ext2 === '.svg'  ? 'image/svg+xml' :
                             'image/jpeg';
        this.s3Service.upload(key, buffer, mime).catch((err: unknown) => {
          this.logger.warn(`Lazy S3 migration failed for ${key}: ${String(err)}`);
        });
      } catch {
        throw new BadRequestException('Logo not found');
      }
    }

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

  @Get(':clinicId/branch-photo/:branchId')
  @Public()
  @ApiOperation({ summary: 'Serve branch cover photo (public)' })
  async serveBranchPhoto(
    @Param('clinicId', ParseUUIDPipe) clinicId: string,
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @Res() res: Response,
  ) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, clinic_id: clinicId },
      select: { photo_url: true },
    });
    if (!branch?.photo_url) throw new BadRequestException('Branch photo not found');

    const buffer = await this.s3Service.getObject(branch.photo_url);
    if (!buffer) throw new BadRequestException('Branch photo not found');

    const ext = extname(branch.photo_url).toLowerCase();
    const contentType =
      ext === '.png'  ? 'image/png'  :
      ext === '.webp' ? 'image/webp' :
                        'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(buffer);
  }
}
