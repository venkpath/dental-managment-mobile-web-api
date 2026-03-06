import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe, UseGuards } from '@nestjs/common';
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
import { UserService } from './user.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Users')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user in the current clinic' })
  @ApiCreatedResponse({ description: 'User created successfully' })
  @ApiNotFoundResponse({ description: 'Branch not found in this clinic' })
  @ApiConflictResponse({ description: 'Email already exists in clinic' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.userService.create(clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List users in the current clinic' })
  @ApiOkResponse({ description: 'List of users' })
  async findAll(@CurrentClinic() clinicId: string) {
    return this.userService.findAll(clinicId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiOkResponse({ description: 'User found' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.findOne(clinicId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({ description: 'User updated successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(clinicId, id, dto);
  }
}
