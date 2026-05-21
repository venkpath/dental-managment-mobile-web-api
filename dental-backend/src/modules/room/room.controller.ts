import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse,
  ApiNotFoundResponse, ApiHeader, ApiBadRequestResponse,
} from '@nestjs/swagger';
import { RoomService } from './room.service.js';
import { CreateRoomDto, UpdateRoomDto, UpdateRoomStatusDto, AssignRoomDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/create-user.dto.js';

@ApiTags('Rooms')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  @ApiOperation({ summary: 'List all active rooms for the clinic (optionally filtered by branch)' })
  @ApiOkResponse({ description: 'List of rooms with today\'s appointment data' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.roomService.findAll(clinicId, branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single room by ID' })
  @ApiOkResponse({ description: 'Room found' })
  @ApiNotFoundResponse({ description: 'Room not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roomService.findOne(clinicId, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new room (branch_id required in body)' })
  @ApiCreatedResponse({ description: 'Room created' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomService.create(clinicId, dto.branch_id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update room details (name, type, notes, order)' })
  @ApiOkResponse({ description: 'Room updated' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomService.update(clinicId, id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Quick-change room status (available | occupied | cleaning | maintenance | reserved)' })
  @ApiOkResponse({ description: 'Room status updated' })
  async setStatus(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomStatusDto,
  ) {
    return this.roomService.setStatus(clinicId, id, dto);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign (or un-assign) an appointment to a room; room flips to occupied' })
  @ApiOkResponse({ description: 'Appointment assigned to room' })
  async assign(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoomDto,
  ) {
    return this.roomService.assignAppointment(clinicId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a room (only if not currently occupied)' })
  @ApiOkResponse({ description: 'Room deleted' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.roomService.remove(clinicId, id);
  }
}
