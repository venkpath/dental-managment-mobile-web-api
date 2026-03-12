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
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

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
    @Query() query: QueryPrescriptionDto,
  ) {
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
