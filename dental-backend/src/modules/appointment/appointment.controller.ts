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
  ApiConflictResponse,
  ApiHeader,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AppointmentService } from './appointment.service.js';
import { CreateAppointmentDto, UpdateAppointmentDto, QueryAppointmentDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Appointments')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new appointment' })
  @ApiCreatedResponse({ description: 'Appointment created successfully' })
  @ApiConflictResponse({ description: 'Dentist has a time slot conflict' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentService.create(clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments with optional filters' })
  @ApiOkResponse({ description: 'List of appointments' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryAppointmentDto,
  ) {
    return this.appointmentService.findAll(clinicId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an appointment by ID' })
  @ApiOkResponse({ description: 'Appointment found' })
  @ApiNotFoundResponse({ description: 'Appointment not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentService.findOne(clinicId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an appointment (reschedule, change status, etc.)' })
  @ApiOkResponse({ description: 'Appointment updated successfully' })
  @ApiNotFoundResponse({ description: 'Appointment not found' })
  @ApiConflictResponse({ description: 'Dentist has a time slot conflict' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentService.update(clinicId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an appointment' })
  @ApiOkResponse({ description: 'Appointment deleted successfully' })
  @ApiNotFoundResponse({ description: 'Appointment not found' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentService.remove(clinicId, id);
  }
}
