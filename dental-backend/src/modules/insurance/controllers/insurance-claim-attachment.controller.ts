import {
  Controller, Get, Post, Delete, Param, Query, Body,
  UseGuards, UseInterceptors, UploadedFile, Res,
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
import { InsuranceClaimAttachmentService } from '../services/insurance-claim-attachment.service.js';

@ApiTags('Insurance — Claim Attachments')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@RequireFeature('INSURANCE_MODULE')
@Controller('insurance/claims/:claimId/attachments')
export class InsuranceClaimAttachmentController {
  constructor(private readonly svc: InsuranceClaimAttachmentService) {}

  // GET /insurance/claims/:claimId/attachments
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DENTIST, UserRole.CONSULTANT)
  list(@CurrentClinic() clinicId: string, @Param('claimId') claimId: string) {
    return this.svc.list(claimId, clinicId);
  }

  // POST /insurance/claims/:claimId/attachments
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST)
  @UseInterceptors(FileInterceptor('file', { storage: undefined, limits: { fileSize: 15 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  upload(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: { sub: string },
    @Param('claimId') claimId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('description') description?: string,
  ) {
    return this.svc.upload({ claimId, clinicId, userId: user.sub, type, description, file });
  }

  // GET /insurance/claims/:claimId/attachments/:attachmentId/download-token
  @Get(':attachmentId/download-token')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DENTIST, UserRole.CONSULTANT)
  getDownloadToken(
    @CurrentClinic() clinicId: string,
    @Param('claimId') claimId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.svc.getDownloadToken(attachmentId, claimId, clinicId);
  }

  // DELETE /insurance/claims/:claimId/attachments/:attachmentId
  @Delete(':attachmentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  delete(
    @CurrentClinic() clinicId: string,
    @Param('claimId') claimId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.svc.delete(attachmentId, claimId, clinicId);
  }
}

// Separate unguarded controller for file serving
@ApiTags('Insurance — Claim Attachments')
@Controller('insurance/claims/attachments')
export class InsuranceClaimAttachmentServeController {
  constructor(private readonly svc: InsuranceClaimAttachmentService) {}

  // GET /insurance/claims/attachments/serve?clinic_id=...&file=...&token=...
  @Public()
  @Get('serve')
  async serve(
    @Query('clinic_id') clinicId: string,
    @Query('file') filePath: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const absPath = this.svc.serveFile(clinicId, filePath, token);
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mime = ext === 'pdf' ? 'application/pdf'
      : ext === 'png' ? 'image/png'
      : ext === 'webp' ? 'image/webp'
      : ext === 'gif' ? 'image/gif'
      : ext === 'zip' ? 'application/zip'
      : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    createReadStream(absPath).pipe(res);
  }
}
