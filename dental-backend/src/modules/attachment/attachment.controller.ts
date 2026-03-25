import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  Query,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { AttachmentService } from './attachment.service.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { Public } from '../../common/decorators/public.decorator.js';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/dicom',
];

@ApiTags('Attachments')
@Controller()
export class AttachmentController {
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('patients/:patientId/attachments/upload')
  @UseGuards(RequireClinicGuard)
  @ApiOperation({ summary: 'Upload a file attachment for a patient' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ description: 'Attachment uploaded successfully' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async upload(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: string,
    @Body('branch_id') branchId: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    if (!type || !['xray', 'report', 'document'].includes(type)) {
      throw new BadRequestException('type must be xray, report, or document');
    }

    return this.attachmentService.uploadFile(clinicId, {
      patientId,
      branchId,
      uploadedBy: req.user!.userId,
      type,
      file,
    });
  }

  @Get('patients/:patientId/attachments')
  @UseGuards(RequireClinicGuard)
  @ApiOperation({ summary: 'Get all attachments for a patient' })
  @ApiOkResponse({ description: 'List of patient attachments' })
  @ApiNotFoundResponse({ description: 'Patient not found in this clinic' })
  async findByPatient(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.attachmentService.findByPatient(clinicId, patientId);
  }

  @Get('attachments/:id/file')
  @Public()
  @ApiOperation({ summary: 'Serve the attachment file (auth via query token)' })
  async serveFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string,
    @Query('clinic_id') clinicId: string,
    @Res() res: Response,
  ) {
    // Verify JWT from query string
    if (!token || !clinicId) {
      throw new UnauthorizedException('Missing authentication');
    }

    try {
      const payload = this.jwtService.verify(token);
      if (payload.clinic_id !== clinicId) {
        throw new UnauthorizedException('Clinic mismatch');
      }
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const attachment = await this.attachmentService.findById(clinicId, id);

    // Resolve absolute path and ensure it's within uploads directory
    const uploadsBase = resolve(process.cwd(), 'uploads');
    const filePath = resolve(process.cwd(), attachment.file_url);
    if (!filePath.startsWith(uploadsBase)) {
      throw new BadRequestException('Invalid file path');
    }

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filePath);
  }

  @Delete('attachments/:id')
  @UseGuards(RequireClinicGuard)
  @ApiOperation({ summary: 'Delete an attachment' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.attachmentService.remove(clinicId, id);
  }
}
