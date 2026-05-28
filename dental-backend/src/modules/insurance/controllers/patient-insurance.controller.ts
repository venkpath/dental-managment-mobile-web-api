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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentClinic } from '../../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../../common/guards/require-clinic.guard.js';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator.js';
import { CreatePatientInsuranceDto } from '../dto/create-patient-insurance.dto.js';
import { UpdatePatientInsuranceDto } from '../dto/update-patient-insurance.dto.js';
import { PatientInsuranceService } from '../services/patient-insurance.service.js';
import { InsuranceFileService } from '../services/insurance-file.service.js';

const VALID_SLOTS = ['card_front', 'card_back', 'referral_letter'] as const;
type Slot = (typeof VALID_SLOTS)[number];

@ApiTags('Insurance — Patient Enrollment')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@RequireFeature('INSURANCE_MODULE')
@Controller()
export class PatientInsuranceController {
  constructor(
    private readonly enrollments: PatientInsuranceService,
    private readonly files: InsuranceFileService,
  ) {}

  @Get('insurance/enrollments')
  @ApiOperation({ summary: 'Clinic-wide list of all patient insurance enrollments (Insurance Portal)' })
  async listAll(
    @CurrentClinic() clinicId: string,
    @Query('search') search?: string,
    @Query('provider_id') provider_id?: string,
    @Query('is_active') is_active?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.enrollments.listAll(clinicId, {
      search: search || undefined,
      provider_id: provider_id || undefined,
      is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('patients/:patientId/insurances')
  @ApiOperation({ summary: 'List a patient\'s insurance / EHS enrollments' })
  async list(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.enrollments.list(clinicId, patientId);
  }

  @Post('patients/:patientId/insurances')
  @ApiOperation({ summary: 'Add a new insurance / EHS enrollment for a patient' })
  async create(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreatePatientInsuranceDto,
  ) {
    return this.enrollments.create(clinicId, patientId, dto);
  }

  @Get('patient-insurances/:id')
  async get(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.enrollments.get(clinicId, id);
  }

  @Patch('patient-insurances/:id')
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientInsuranceDto,
  ) {
    return this.enrollments.update(clinicId, id, dto);
  }

  @Delete('patient-insurances/:id')
  async remove(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.enrollments.remove(clinicId, id);
  }

  @Post('patient-insurances/:id/documents/:slot')
  @ApiOperation({ summary: 'Upload card front / back / referral letter' })
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
    return this.enrollments.uploadDocument(clinicId, id, slot as Slot, file);
  }

  @Get('patient-insurances/:id/download-token')
  @ApiOperation({ summary: 'Mint a signed-token URL for downloading a patient document' })
  async downloadToken(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('slot') slot: string,
  ) {
    if (!VALID_SLOTS.includes(slot as Slot)) {
      throw new BadRequestException(`Invalid slot. Must be one of: ${VALID_SLOTS.join(', ')}`);
    }
    const row = await this.enrollments.get(clinicId, id);
    const field = ({
      card_front: 'card_front_url',
      card_back: 'card_back_url',
      referral_letter: 'referral_letter_url',
    } as const)[slot as Slot];
    const filePath = (row as unknown as Record<string, string | null>)[field];
    if (!filePath) throw new BadRequestException('No file uploaded for that slot');
    const { token } = this.files.buildDownloadUrl({ clinicId, filePath });
    return { token, file_url: filePath };
  }

  @Get('patient-insurances/:id/eligibility')
  @ApiOperation({ summary: 'Eligibility check — used by the appointment + invoice banners' })
  async eligibility(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.enrollments.checkEligibility(clinicId, id);
  }

  @Post('patient-insurances/:id/coverage-preview')
  @ApiOperation({
    summary: 'Compute per-line insurance vs patient breakdown for a set of invoice items',
    description: 'Pure read — used by the invoice form for live coverage preview before saving.',
  })
  async coveragePreview(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { items: Array<{ description: string; category: 'preventive' | 'basic' | 'major' | 'ortho' | 'emergency'; clinic_rate: number; scheme_max_fee?: number | null; quantity?: number }> },
  ) {
    if (!body?.items?.length) {
      throw new BadRequestException('items array is required');
    }
    return this.enrollments.previewCoverage(clinicId, id, body.items);
  }
}
