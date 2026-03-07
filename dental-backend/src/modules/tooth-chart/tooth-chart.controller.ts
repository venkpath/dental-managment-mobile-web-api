import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
import { ToothChartService } from './tooth-chart.service.js';
import { CreateToothConditionDto, UpdateToothConditionDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Tooth Chart')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller()
export class ToothChartController {
  constructor(private readonly toothChartService: ToothChartService) {}

  @Get('teeth')
  @ApiOperation({ summary: 'Get all teeth (FDI reference data)' })
  @ApiOkResponse({ description: 'List of 32 teeth' })
  async getTeeth() {
    return this.toothChartService.getTeeth();
  }

  @Get('tooth-surfaces')
  @ApiOperation({ summary: 'Get all tooth surfaces (reference data)' })
  @ApiOkResponse({ description: 'List of tooth surfaces' })
  async getSurfaces() {
    return this.toothChartService.getSurfaces();
  }

  @Get('patients/:patientId/tooth-chart')
  @ApiOperation({ summary: 'Get full tooth chart for a patient' })
  @ApiOkResponse({ description: 'Patient tooth chart with teeth, surfaces, and conditions' })
  @ApiNotFoundResponse({ description: 'Patient not found in this clinic' })
  async getPatientToothChart(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.toothChartService.getPatientToothChart(clinicId, patientId);
  }

  @Post('patient-tooth-condition')
  @ApiOperation({ summary: 'Add a tooth condition for a patient' })
  @ApiCreatedResponse({ description: 'Tooth condition created successfully' })
  @ApiNotFoundResponse({ description: 'Branch, patient, tooth, surface, or dentist not found' })
  async createCondition(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateToothConditionDto,
  ) {
    return this.toothChartService.createCondition(clinicId, dto);
  }

  @Patch('patient-tooth-condition/:id')
  @ApiOperation({ summary: 'Update a tooth condition' })
  @ApiOkResponse({ description: 'Tooth condition updated successfully' })
  @ApiNotFoundResponse({ description: 'Tooth condition not found' })
  async updateCondition(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateToothConditionDto,
  ) {
    return this.toothChartService.updateCondition(clinicId, id, dto);
  }
}
