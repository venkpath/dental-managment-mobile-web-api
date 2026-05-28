import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  Res,
  Query,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { TreatmentMediaService } from './treatment-media.service.js';
import { UploadTreatmentMediaDto } from './dto/upload-treatment-media.dto.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('Treatment Media')
@Controller()
export class TreatmentMediaController {
  constructor(
    private readonly treatmentMediaService: TreatmentMediaService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('treatments/:treatmentId/media/upload')
  @UseGuards(RequireClinicGuard)
  @ApiOperation({ summary: 'Upload a photo, X-ray, report, or document for a treatment' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ description: 'Media uploaded and compressed to S3' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(
    @CurrentClinic() clinicId: string,
    @Param('treatmentId', ParseUUIDPipe) treatmentId: string,
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadTreatmentMediaDto,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.treatmentMediaService.upload(clinicId, {
      treatmentId,
      branchId: dto.branch_id,
      uploadedBy: req.user!.userId,
      mediaType: dto.media_type,
      visitDate: dto.visit_date,
      caption: dto.caption,
      file,
    });
  }

  @Get('treatments/:treatmentId/media')
  @UseGuards(RequireClinicGuard)
  @ApiOperation({ summary: 'List all media for a treatment, ordered by visit date' })
  @ApiOkResponse({ description: 'Treatment media list' })
  async findByTreatment(
    @CurrentClinic() clinicId: string,
    @Param('treatmentId', ParseUUIDPipe) treatmentId: string,
  ) {
    return this.treatmentMediaService.findByTreatment(clinicId, treatmentId);
  }

  @Get('patients/:patientId/treatment-media')
  @UseGuards(RequireClinicGuard)
  @ApiOperation({ summary: 'List all treatment media for a patient across all treatments' })
  @ApiOkResponse({ description: 'Patient treatment media list' })
  async findByPatient(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.treatmentMediaService.findByPatient(clinicId, patientId);
  }

  @Get('treatment-media/:id/file')
  @Public()
  @ApiOperation({ summary: 'Redirect to a presigned S3 URL for the treatment media file' })
  async serveFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('token') token: string,
    @Query('clinic_id') clinicId: string,
    @Res() res: Response,
  ) {
    if (!token || !clinicId) throw new UnauthorizedException('Missing authentication');

    try {
      const payload = this.jwtService.verify(token);
      if (payload.clinic_id !== clinicId) throw new UnauthorizedException('Clinic mismatch');
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const signedUrl = await this.treatmentMediaService.getSignedUrl(clinicId, id);
    res.redirect(302, signedUrl);
  }

  @Delete('treatment-media/:id')
  @UseGuards(RequireClinicGuard)
  @ApiOperation({ summary: 'Delete a treatment media record and file from S3' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.treatmentMediaService.remove(clinicId, id);
  }
}
