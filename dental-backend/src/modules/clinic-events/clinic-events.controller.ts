import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/index.js';
import { ClinicEventsService } from './clinic-events.service.js';
import { CreateClinicEventDto, UpdateClinicEventDto } from './dto/index.js';

@ApiTags('Clinic Events')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@Controller('clinic-events')
export class ClinicEventsController {
  constructor(private readonly eventsService: ClinicEventsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all events (system festivals + clinic-specific)' })
  async findAll(@CurrentClinic() clinicId: string) {
    return this.eventsService.findAll(clinicId);
  }

  @Get('upcoming')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get upcoming events in the next N days' })
  async getUpcoming(
    @CurrentClinic() clinicId: string,
    @Query('days') days?: string,
  ) {
    return this.eventsService.getUpcoming(clinicId, days ? parseInt(days, 10) : 30);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a clinic-specific event' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateClinicEventDto,
  ) {
    return this.eventsService.create(clinicId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an event (system events get cloned for clinic)' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClinicEventDto,
  ) {
    return this.eventsService.update(clinicId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a clinic-specific event' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id') id: string,
  ) {
    return this.eventsService.remove(clinicId, id);
  }
}
