import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFile, Res,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiHeader, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { CurrentClinic } from '../../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequireClinicGuard } from '../../../common/guards/require-clinic.guard.js';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { UserRole } from '../../user/dto/index.js';
import {
  InsurancePreAuthService,
  type CreatePreAuthDto,
  type SubmitPreAuthDto,
  type UpdatePreAuthStatusDto,
} from '../services/insurance-pre-auth.service.js';

const VALID_SLOTS = ['request', 'approval', 'rejection'] as const;
type Slot = (typeof VALID_SLOTS)[number];

@ApiTags('Insurance — Pre-Authorisation')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@RequireFeature('INSURANCE_MODULE')
@Controller('insurance/pre-auths')
export class InsurancePreAuthController {
  constructor(private readonly svc: InsurancePreAuthService) {}

  // GET /insurance/pre-auths
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DENTIST, UserRole.CONSULTANT)
  findAll(
    @CurrentClinic() clinicId: string,
    @Query('status') status?: string,
    @Query('patient_id') patient_id?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
  ) {
    return this.svc.findAll(clinicId, { status, patient_id, skip, take });
  }

  // GET /insurance/pre-auths/:id
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DENTIST, UserRole.CONSULTANT)
  findOne(@CurrentClinic() clinicId: string, @Param('id') id: string) {
    return this.svc.findOne(id, clinicId);
  }

  // POST /insurance/pre-auths
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST)
  create(@CurrentClinic() clinicId: string, @Body() dto: CreatePreAuthDto) {
    return this.svc.create(clinicId, dto);
  }

  // POST /insurance/pre-auths/:id/submit
  @Post(':id/submit')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST)
  submit(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: SubmitPreAuthDto,
  ) {
    return this.svc.submit(id, clinicId, dto, user.sub);
  }

  // POST /insurance/pre-auths/:id/status
  @Post(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  updateStatus(
    @CurrentClinic() clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePreAuthStatusDto,
  ) {
    return this.svc.updateStatus(id, clinicId, dto);
  }

  // POST /insurance/pre-auths/:id/documents/:slot
  @Post(':id/documents/:slot')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @UseInterceptors(FileInterceptor('file', { storage: undefined, limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  uploadDocument(
    @CurrentClinic() clinicId: string,
    @Param('id') id: string,
    @Param('slot') slot: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!VALID_SLOTS.includes(slot as Slot)) {
      throw new Error(`Invalid slot: ${slot}. Must be one of: ${VALID_SLOTS.join(', ')}`);
    }
    return this.svc.uploadDocument(id, clinicId, slot as Slot, file);
  }

  // GET /insurance/pre-auths/:id/download-token?slot=request
  @Get(':id/download-token')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DENTIST, UserRole.CONSULTANT)
  getDownloadToken(
    @CurrentClinic() clinicId: string,
    @Param('id') id: string,
    @Query('slot') slot: string,
  ) {
    if (!VALID_SLOTS.includes(slot as Slot)) {
      throw new Error(`Invalid slot: ${slot}`);
    }
    return this.svc.getDownloadToken(id, clinicId, slot as Slot);
  }
}

// Public serve controller
@ApiTags('Insurance — Pre-Authorisation')
@Controller('insurance/pre-auths')
export class InsurancePreAuthServeController {
  constructor(private readonly svc: InsurancePreAuthService) {}

  @Public()
  @Get('files/serve')
  serve(
    @Query('clinic_id') clinicId: string,
    @Query('file') filePath: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const absPath = this.svc.serveFile(clinicId, filePath, token);
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mime = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    createReadStream(absPath).pipe(res);
  }
}
