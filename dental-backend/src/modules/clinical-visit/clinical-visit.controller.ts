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
  HttpCode,
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
import { ClinicalVisitService } from './clinical-visit.service.js';
import {
  CreateClinicalVisitDto,
  UpdateClinicalVisitDto,
  QueryClinicalVisitDto,
  CreateTreatmentPlanDto,
  UpdateTreatmentPlanDto,
} from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Clinical Visits')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller()
export class ClinicalVisitController {
  constructor(private readonly service: ClinicalVisitService) {}

  // ── Clinical Visits ────────────────────────────────────────

  @Post('clinical-visits')
  @ApiOperation({ summary: 'Start a new clinical visit (consultation)' })
  @ApiCreatedResponse({ description: 'Visit created' })
  create(@CurrentClinic() clinicId: string, @Body() dto: CreateClinicalVisitDto) {
    return this.service.create(clinicId, dto);
  }

  @Get('clinical-visits')
  @ApiOperation({ summary: 'List clinical visits' })
  @ApiOkResponse({ description: 'List of clinical visits' })
  findAll(@CurrentClinic() clinicId: string, @Query() query: QueryClinicalVisitDto) {
    return this.service.findAll(clinicId, query);
  }

  @Get('patients/:patientId/clinical-visits')
  @ApiOperation({ summary: 'Get all clinical visits for a patient (chronological history)' })
  findByPatient(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.findByPatient(clinicId, patientId);
  }

  @Get('clinical-visits/:id')
  @ApiOperation({ summary: 'Get visit detail (with findings, plans, treatments)' })
  @ApiNotFoundResponse({ description: 'Visit not found' })
  findOne(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(clinicId, id);
  }

  @Patch('clinical-visits/:id')
  @ApiOperation({ summary: 'Update visit (chief complaint, exam notes, SOAP, etc.)' })
  update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicalVisitDto,
  ) {
    return this.service.update(clinicId, id, dto);
  }

  @Post('clinical-visits/:id/finalize')
  @HttpCode(200)
  @ApiOperation({ summary: 'Finalize the visit — locks the clinical record' })
  finalize(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.finalize(clinicId, id);
  }

  @Post('clinical-visits/:id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel the visit' })
  cancel(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(clinicId, id);
  }

  // ── Treatment Plans ────────────────────────────────────────

  @Post('treatment-plans')
  @ApiOperation({ summary: 'Create a treatment plan (optionally tied to a clinical visit)' })
  @ApiCreatedResponse({ description: 'Treatment plan created' })
  createPlan(@CurrentClinic() clinicId: string, @Body() dto: CreateTreatmentPlanDto) {
    return this.service.createPlan(clinicId, dto);
  }

  @Get('patients/:patientId/treatment-plans')
  @ApiOperation({ summary: 'List treatment plans for a patient' })
  findPlansByPatient(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.service.findPlansByPatient(clinicId, patientId);
  }

  @Get('treatment-plans/:id')
  @ApiOperation({ summary: 'Get treatment plan detail (with items & treatments)' })
  findOnePlan(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOnePlan(clinicId, id);
  }

  @Patch('treatment-plans/:id')
  @ApiOperation({ summary: 'Update plan title, notes, or status' })
  updatePlan(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentPlanDto,
  ) {
    return this.service.updatePlan(clinicId, id, dto);
  }

  @Post('treatment-plans/:id/accept')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Accept the plan — creates Treatment records for each item',
    description: 'Converts every proposed item into a planned Treatment and marks the plan as accepted.',
  })
  acceptPlan(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.acceptPlan(clinicId, id);
  }

  @Delete('treatment-plans/:id')
  @ApiOperation({ summary: 'Delete a treatment plan' })
  @HttpCode(204)
  deletePlan(@CurrentClinic() clinicId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.deletePlan(clinicId, id);
  }
}
