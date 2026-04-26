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
import { CreateAppointmentDto, UpdateAppointmentDto, QueryAppointmentDto, QueryAvailableSlotsDto, CreateRecurringAppointmentDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { applyDentistScope } from '../../common/utils/dentist-scope.util.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';

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

  @Post('recurring')
  @ApiOperation({ summary: 'Create a recurring appointment series (weekly/biweekly/monthly)' })
  @ApiCreatedResponse({ description: 'Recurring appointments created. Conflicting dates are automatically skipped.' })
  @ApiBadRequestResponse({ description: 'Invalid input or no valid dates available' })
  async createRecurring(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateRecurringAppointmentDto,
  ) {
    return this.appointmentService.createRecurring(clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments with optional filters' })
  @ApiOkResponse({ description: 'List of appointments' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryAppointmentDto,
  ) {
    applyDentistScope(query, user);
    return this.appointmentService.findAll(clinicId, query);
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Get available time slots for a dentist on a date (uses branch scheduling settings)' })
  @ApiOkResponse({ description: 'List of available time slots' })
  async getAvailableSlots(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryAvailableSlotsDto,
  ) {
    return this.appointmentService.getAvailableSlots(clinicId, query);
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
