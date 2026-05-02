import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RequireFeature } from '../../common/decorators/require-feature.decorator.js';
import { TrackAiUsage } from '../../common/decorators/track-ai-usage.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';
import { ConsentService } from './consent.service.js';
import { SUPPORTED_CONSENT_LANGUAGES } from './consent-ai.prompt.js';
import {
  AiGenerateConsentTemplateDto,
  CreateConsentTemplateDto,
  CreatePatientConsentDto,
  PublicSignConsentDto,
  SendConsentLinkDto,
  SignDigitalConsentDto,
  UpdateConsentTemplateDto,
  VerifyConsentOtpDto,
} from './dto.js';

@ApiTags('Consent Forms')
@ApiBearerAuth()
@Controller()
export class ConsentController {
  constructor(private readonly consents: ConsentService) {}

  // ─── Templates ──────────────────────────────────────────────────

  @Get('consent-templates/languages')
  @ApiOperation({ summary: 'List supported consent template languages' })
  listLanguages() {
    return SUPPORTED_CONSENT_LANGUAGES;
  }

  @Get('consent-templates')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT, UserRole.RECEPTIONIST, UserRole.STAFF)
  @ApiOperation({ summary: 'List consent templates for the clinic' })
  list(
    @Req() req: Request,
    @Query('language') language?: string,
    @Query('code') code?: string,
    @Query('is_active') isActive?: string,
  ) {
    return this.consents.listTemplates(req.user!.clinicId, {
      language,
      code,
      is_active: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get('consent-templates/:id')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT, UserRole.RECEPTIONIST, UserRole.STAFF)
  get(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.consents.getTemplate(req.user!.clinicId, id);
  }

  @Post('consent-templates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a custom consent template' })
  create(@Req() req: Request, @Body() dto: CreateConsentTemplateDto) {
    return this.consents.createTemplate(req.user!.clinicId, req.user!.userId, dto);
  }

  @Post('consent-templates/seed-defaults')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Seed the 12 default English templates (idempotent)' })
  seedDefaults(@Req() req: Request) {
    return this.consents.seedDefaults(req.user!.clinicId, req.user!.userId);
  }

  @Post('consent-templates/ai-generate')
  @Roles(UserRole.ADMIN)
  @TrackAiUsage()
  @RequireFeature('AI_CONSENT_FORM')
  @ApiOperation({ summary: 'Generate a consent template with AI in any supported language' })
  aiGenerate(@Req() req: Request, @Body() dto: AiGenerateConsentTemplateDto) {
    return this.consents.aiGenerateTemplate(req.user!.clinicId, req.user!.userId, dto);
  }

  @Patch('consent-templates/:id')
  @Roles(UserRole.ADMIN)
  update(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConsentTemplateDto,
  ) {
    return this.consents.updateTemplate(req.user!.clinicId, id, dto);
  }

  @Delete('consent-templates/:id')
  @Roles(UserRole.ADMIN)
  remove(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.consents.deleteTemplate(req.user!.clinicId, id);
  }

  // ─── Patient consents ───────────────────────────────────────────

  @Get('patients/:patientId/consents')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT, UserRole.RECEPTIONIST, UserRole.STAFF)
  listForPatient(@Req() req: Request, @Param('patientId', ParseUUIDPipe) patientId: string) {
    return this.consents.listForPatient(req.user!.clinicId, patientId);
  }

  @Post('patients/:patientId/consents')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Generate a consent (unsigned) for the patient' })
  createForPatient(
    @Req() req: Request,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientConsentDto,
  ) {
    return this.consents.createForPatient(
      req.user!.clinicId,
      patientId,
      req.user!.userId,
      dto,
    );
  }

  @Get('consents/:id/download')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT, UserRole.RECEPTIONIST, UserRole.STAFF)
  download(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.consents.getDownloadUrl(req.user!.clinicId, id);
  }

  @Post('consents/:id/sign-digital')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Sign a consent using the in-app digital signature pad' })
  signDigital(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignDigitalConsentDto,
  ) {
    return this.consents.signDigital(req.user!.clinicId, id, dto, req.user!.userId);
  }

  @Post('consents/:id/sign-upload')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT, UserRole.RECEPTIONIST)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        signed_by_name: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload a scanned, paper-signed consent (PDF/PNG/JPEG ≤ 10MB)' })
  signUpload(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('signed_by_name') signedByName: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.consents.signUpload(
      req.user!.clinicId,
      id,
      { mimetype: file.mimetype, buffer: file.buffer, size: file.size },
      signedByName,
      req.user!.userId,
    );
  }

  @Post('consents/:id/archive')
  @Roles(UserRole.ADMIN)
  archive(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return this.consents.archive(req.user!.clinicId, id);
  }

  // ─── Remote-link signing (clinic side) ──────────────────────────

  @Post('consents/:id/send-link')
  @Roles(UserRole.ADMIN, UserRole.DENTIST, UserRole.CONSULTANT, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Send a one-time signing link to the patient via WhatsApp/SMS',
  })
  sendLink(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendConsentLinkDto,
  ) {
    return this.consents.sendSignLink(req.user!.clinicId, id, {
      channel: dto.channel,
      expires_in_hours: dto.expires_in_hours,
    });
  }

  // ─── Public signing routes (patient side, no auth) ──────────────

  @Public()
  @Throttle({ strict: { ttl: 60000, limit: 30 } })
  @Get('public/consents/:token')
  @ApiOperation({ summary: 'Public — fetch consent metadata by signing token' })
  publicGet(@Param('token') token: string) {
    return this.consents.getByPublicToken(token);
  }

  @Public()
  @Throttle({ strict: { ttl: 60000, limit: 20 } })
  @Get('public/consents/:token/pdf')
  @ApiOperation({ summary: 'Public — get a presigned URL to view the unsigned PDF' })
  publicPdf(@Param('token') token: string) {
    return this.consents.getPublicPdfUrl(token);
  }

  // OTP request dispatches a paid WhatsApp message — keep it tight.
  @Public()
  @Throttle({ strict: { ttl: 60000, limit: 3 } })
  @Post('public/consents/:token/request-otp')
  @ApiOperation({ summary: 'Public — send a one-time code to the patient phone' })
  publicRequestOtp(@Param('token') token: string) {
    return this.consents.requestPublicOtp(token);
  }

  // Brute-force defense (the per-consent otp_attempts counter is the
  // primary guard; this throttle is the IP-level second line).
  @Public()
  @Throttle({ strict: { ttl: 60000, limit: 10 } })
  @Post('public/consents/:token/verify-otp')
  @ApiOperation({ summary: 'Public — verify the OTP entered on the sign page' })
  publicVerifyOtp(
    @Param('token') token: string,
    @Body() dto: VerifyConsentOtpDto,
  ) {
    return this.consents.verifyPublicOtp(token, dto.code);
  }

  @Public()
  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @Post('public/consents/:token/sign')
  @ApiOperation({ summary: 'Public — submit signature, finalise consent' })
  publicSign(
    @Req() req: Request,
    @Param('token') token: string,
    @Body() dto: PublicSignConsentDto,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      '';
    const userAgent = (req.headers['user-agent'] as string) || '';
    return this.consents.signPublic(token, dto, { ip, user_agent: userAgent });
  }
}
