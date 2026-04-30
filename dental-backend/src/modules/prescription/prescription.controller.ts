import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Redirect,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiHeader,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { PrescriptionService } from './prescription.service.js';
import { CreatePrescriptionDto, UpdatePrescriptionDto, QueryPrescriptionDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { applyDentistScope } from '../../common/utils/dentist-scope.util.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';

/** Public — no auth guard. Used for WhatsApp prescription link redirect. */
@ApiTags('Prescriptions')
@Controller()
export class PrescriptionPublicController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Get('public/prescription-redirect/:id')
  @Redirect()
  @ApiOperation({ summary: 'Redirect WhatsApp link to a fresh S3 signed prescription PDF URL' })
  async prescriptionRedirect(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clinic') clinicId: string,
  ) {
    // WhatsApp links always render the digital version (with letterhead bg).
    const { url } = await this.prescriptionService.getPdfUrl(clinicId, id, { withBackground: true });
    return { url, statusCode: 302 };
  }
}

@ApiTags('Prescriptions')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller()
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Get('prescriptions')
  @ApiOperation({ summary: 'List all prescriptions with pagination and filters' })
  @ApiOkResponse({ description: 'Paginated list of prescriptions' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryPrescriptionDto,
  ) {
    applyDentistScope(query, user);
    return this.prescriptionService.findAll(clinicId, query);
  }

  @Post('prescriptions')
  @ApiOperation({ summary: 'Create a new prescription with medicine items' })
  @ApiCreatedResponse({ description: 'Prescription created successfully' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionService.create(clinicId, dto);
  }

  @Get('prescriptions/:id')
  @ApiOperation({ summary: 'Get a prescription by ID' })
  @ApiOkResponse({ description: 'Prescription found' })
  @ApiNotFoundResponse({ description: 'Prescription not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prescriptionService.findOne(clinicId, id);
  }

  @Patch('prescriptions/:id')
  @ApiOperation({ summary: 'Update a prescription (diagnosis, instructions, or medicine items)' })
  @ApiOkResponse({ description: 'Prescription updated successfully' })
  @ApiNotFoundResponse({ description: 'Prescription not found' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionService.update(clinicId, id, dto);
  }

  @Get('prescriptions/:id/pdf')
  @ApiOperation({
    summary: 'Generate prescription PDF and return a signed S3 URL',
    description:
      'Pass `bg=0` to render text-only output for printing on a clinic\'s pre-printed physical notepad (no letterhead overlay). Default is `bg=1` (digital, with letterhead). Only affects branches with a custom template configured.',
  })
  @ApiOkResponse({ description: 'Signed URL to prescription PDF' })
  async getPdfUrl(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('bg') bg?: string,
  ) {
    const withBackground = bg !== '0' && bg !== 'false';
    return this.prescriptionService.getPdfUrl(clinicId, id, { withBackground });
  }

  @Post('prescriptions/:id/send-whatsapp')
  @ApiOperation({ summary: 'Send prescription PDF link to patient via WhatsApp' })
  @ApiOkResponse({ description: 'WhatsApp message sent' })
  async sendWhatsApp(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prescriptionService.sendWhatsApp(clinicId, id);
  }

  @Get('patients/:patientId/prescriptions')
  @ApiOperation({ summary: 'Get all prescriptions for a patient' })
  @ApiOkResponse({ description: 'List of prescriptions for the patient' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  async findByPatient(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.prescriptionService.findByPatient(clinicId, patientId);
  }
}
