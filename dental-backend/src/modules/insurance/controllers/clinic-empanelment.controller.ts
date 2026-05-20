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
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentClinic } from '../../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../../common/guards/require-clinic.guard.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator.js';
import { CreateEmpanelmentDto } from '../dto/create-empanelment.dto.js';
import { UpdateEmpanelmentDto } from '../dto/update-empanelment.dto.js';
import { ClinicEmpanelmentService } from '../services/clinic-empanelment.service.js';
import { InsuranceFileService } from '../services/insurance-file.service.js';

const VALID_SLOTS = ['certificate', 'rate_card', 'tpa_mou'] as const;
type Slot = (typeof VALID_SLOTS)[number];

@ApiTags('Insurance — Clinic Empanelment')
@ApiHeader({ name: 'x-clinic-id', required: true })
@Controller('insurance/empanelments')
export class ClinicEmpanelmentController {
  constructor(
    private readonly empanelments: ClinicEmpanelmentService,
    private readonly files: InsuranceFileService,
  ) {}

  @Get()
  @UseGuards(RequireClinicGuard)
  @RequireFeature('INSURANCE_MODULE')
  @ApiOperation({ summary: 'List the clinic\'s scheme empanelments' })
  async list(@CurrentClinic() clinicId: string) {
    return this.empanelments.list(clinicId);
  }

  @Get(':id')
  @UseGuards(RequireClinicGuard)
  @RequireFeature('INSURANCE_MODULE')
  async get(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.empanelments.get(clinicId, id);
  }

  @Post()
  @UseGuards(RequireClinicGuard)
  @RequireFeature('INSURANCE_MODULE')
  @ApiOperation({ summary: 'Register a new scheme empanelment for the clinic' })
  async create(@CurrentClinic() clinicId: string, @Body() dto: CreateEmpanelmentDto) {
    return this.empanelments.create(clinicId, dto);
  }

  @Patch(':id')
  @UseGuards(RequireClinicGuard)
  @RequireFeature('INSURANCE_MODULE')
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmpanelmentDto,
  ) {
    return this.empanelments.update(clinicId, id, dto);
  }

  @Delete(':id')
  @UseGuards(RequireClinicGuard)
  @RequireFeature('INSURANCE_MODULE')
  async remove(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.empanelments.remove(clinicId, id);
  }

  @Post(':id/documents/:slot')
  @UseGuards(RequireClinicGuard)
  @RequireFeature('INSURANCE_MODULE')
  @ApiOperation({ summary: 'Upload empanelment cert / CGHS rate card / TPA MoU' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async upload(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('slot') slot: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!VALID_SLOTS.includes(slot as Slot)) {
      throw new BadRequestException(`Invalid slot. Must be one of: ${VALID_SLOTS.join(', ')}`);
    }
    return this.empanelments.uploadDocument(clinicId, id, slot as Slot, file);
  }

  @Get(':id/download-token')
  @UseGuards(RequireClinicGuard)
  @RequireFeature('INSURANCE_MODULE')
  @ApiOperation({ summary: 'Mint a short-lived token for downloading one of this empanelment\'s files' })
  async getDownloadToken(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('slot') slot: string,
  ) {
    if (!VALID_SLOTS.includes(slot as Slot)) {
      throw new BadRequestException(`Invalid slot. Must be one of: ${VALID_SLOTS.join(', ')}`);
    }
    const row = await this.empanelments.get(clinicId, id);
    const field = ({
      certificate: 'certificate_url',
      rate_card: 'rate_card_url',
      tpa_mou: 'tpa_mou_url',
    } as const)[slot as Slot];
    const filePath = (row as unknown as Record<string, string | null>)[field];
    if (!filePath) throw new BadRequestException('No file uploaded for that slot');
    const { token } = this.files.buildDownloadUrl({ clinicId, filePath });
    return { token, file_url: filePath };
  }

  @Get('files/serve')
  @Public()
  @ApiOperation({ summary: 'Serve an insurance file by signed token + clinic id' })
  @ApiOkResponse({ description: 'Streams the file' })
  async serve(
    @Query('clinic_id') clinicId: string,
    @Query('file') filePath: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    if (!clinicId || !filePath || !token) {
      throw new BadRequestException('Missing clinic_id, file or token');
    }
    const abs = this.files.resolveForServing({ clinicId, filePath, token });
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(abs);
  }
}
