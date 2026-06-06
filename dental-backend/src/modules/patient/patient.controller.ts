import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiHeader,
  ApiBadRequestResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PatientService } from './patient.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { PatientImportProducer } from './patient-import.producer.js';
import { CreatePatientDto, UpdatePatientDto, QueryPatientDto, BulkImportDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { RequireFeature } from '../../common/decorators/require-feature.decorator.js';

@ApiTags('Patients')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('patients')
export class PatientController {
  constructor(
    private readonly patientService: PatientService,
    private readonly s3Service: S3Service,
    private readonly importProducer: PatientImportProducer,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new patient' })
  @ApiCreatedResponse({ description: 'Patient created successfully' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreatePatientDto,
  ) {
    return this.patientService.create(clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List patients with optional search filters' })
  @ApiOkResponse({ description: 'List of patients' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryPatientDto,
  ) {
    return this.patientService.findAll(clinicId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a patient by ID' })
  @ApiOkResponse({ description: 'Patient found' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientService.findOne(clinicId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient details' })
  @ApiOkResponse({ description: 'Patient updated successfully' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientService.update(clinicId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a patient' })
  @ApiOkResponse({ description: 'Patient deleted successfully' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientService.remove(clinicId, id);
  }

  @Post(':id/profile-photo')
  @ApiOperation({ summary: 'Upload a profile photo for the patient (private, served via presigned URL)' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Profile photo uploaded' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadProfilePhoto(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.patientService.uploadProfilePhoto(clinicId, id, file);
  }

  @Delete(':id/profile-photo')
  @ApiOperation({ summary: 'Remove the profile photo for the patient' })
  @ApiOkResponse({ description: 'Profile photo removed' })
  async deleteProfilePhoto(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientService.deleteProfilePhoto(clinicId, id);
  }

  // ─── Bulk Import (CSV / Excel file — async via job queue) ──────

  @Post('import/file')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireFeature('PATIENT_IMPORT')
  @ApiOperation({ summary: 'Upload CSV/Excel and queue async import job. Returns jobId immediately.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        branch_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importFromFile(
    @CurrentClinic() clinicId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('branch_id') branchId: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!branchId) throw new BadRequestException('branch_id is required');

    const fileKey = `patient-imports/${clinicId}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    await this.s3Service.upload(fileKey, file.buffer, file.mimetype);

    const job = await this.patientService.createImportJob(clinicId, branchId, fileKey, file.mimetype);
    await this.importProducer.enqueue({ jobId: job.id, clinicId, branchId, fileKey, fileMime: file.mimetype });

    return { jobId: job.id };
  }

  // ─── Import Job status ──────────────────────────────────────────

  @Get('import/jobs')
  @RequireFeature('PATIENT_IMPORT')
  @ApiOperation({ summary: 'Get last 10 import jobs for this clinic' })
  async getRecentImportJobs(@CurrentClinic() clinicId: string) {
    return this.patientService.getRecentImportJobs(clinicId);
  }

  @Get('import/jobs/:jobId')
  @RequireFeature('PATIENT_IMPORT')
  @ApiOperation({ summary: 'Poll the status of a patient import job' })
  async getImportJob(
    @CurrentClinic() clinicId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.patientService.getImportJob(clinicId, jobId);
  }

  // ─── Bulk Import (JSON array — used after AI extraction preview) ──

  @Post('import/bulk')
  @RequireFeature('PATIENT_IMPORT')
  @ApiOperation({ summary: 'Bulk import patients from JSON array (after preview/edit)' })
  async importBulk(
    @CurrentClinic() clinicId: string,
    @Body() dto: BulkImportDto,
  ) {
    if (dto.patients.length === 0) throw new BadRequestException('No patients to import');
    if (dto.patients.length > 1000) throw new BadRequestException('Maximum 1000 patients per import');

    return this.patientService.bulkImport(clinicId, dto.branch_id, dto.patients);
  }

  // ─── AI Image Extraction ──────────────────────────────────────

  @Post('import/image')
  @RequireFeature('PATIENT_IMPORT')
  @ApiOperation({ summary: 'Extract patient data from image using AI (handwritten notes, registers)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        branch_id: { type: 'string', format: 'uuid' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async importFromImage(
    @CurrentClinic() clinicId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('branch_id') branchId: string,
  ) {
    if (!file) throw new BadRequestException('No image uploaded');
    if (!branchId) throw new BadRequestException('branch_id is required');

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid image type. Supported: JPEG, PNG, WebP, GIF');
    }

    return this.patientService.extractPatientsFromImage(clinicId, branchId, file.buffer, file.mimetype);
  }
}
