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
import { PatientService } from './patient.service.js';
import { CreatePatientDto, UpdatePatientDto, QueryPatientDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Patients')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

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
}
