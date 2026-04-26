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
import { TreatmentService } from './treatment.service.js';
import { CreateTreatmentDto, UpdateTreatmentDto, QueryTreatmentDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { applyDentistScope } from '../../common/utils/dentist-scope.util.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';

@ApiTags('Treatments')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller()
export class TreatmentController {
  constructor(private readonly treatmentService: TreatmentService) {}

  @Post('treatments')
  @ApiOperation({ summary: 'Create a new treatment record' })
  @ApiCreatedResponse({ description: 'Treatment created successfully' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateTreatmentDto,
  ) {
    return this.treatmentService.create(clinicId, dto);
  }

  @Get('treatments')
  @ApiOperation({ summary: 'List treatments with optional filters' })
  @ApiOkResponse({ description: 'List of treatments' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryTreatmentDto,
  ) {
    applyDentistScope(query, user);
    return this.treatmentService.findAll(clinicId, query);
  }

  @Get('patients/:patientId/treatments')
  @ApiOperation({ summary: 'Get dental chart – all treatments for a patient' })
  @ApiOkResponse({ description: 'List of treatments for the patient' })
  @ApiNotFoundResponse({ description: 'Patient not found' })
  async findByPatient(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.treatmentService.findByPatient(clinicId, patientId);
  }

  @Get('treatments/:id')
  @ApiOperation({ summary: 'Get a treatment by ID' })
  @ApiOkResponse({ description: 'Treatment found' })
  @ApiNotFoundResponse({ description: 'Treatment not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.treatmentService.findOne(clinicId, id);
  }

  @Patch('treatments/:id')
  @ApiOperation({ summary: 'Update treatment details or status' })
  @ApiOkResponse({ description: 'Treatment updated successfully' })
  @ApiNotFoundResponse({ description: 'Treatment not found' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentDto,
  ) {
    return this.treatmentService.update(clinicId, id, dto);
  }
}
