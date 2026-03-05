import { Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiCreatedResponse({ description: 'User created successfully' })
  @ApiNotFoundResponse({ description: 'Clinic or branch not found' })
  @ApiConflictResponse({ description: 'Email already exists in clinic' })
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List users' })
  @ApiOkResponse({ description: 'List of users' })
  @ApiQuery({ name: 'clinic_id', required: false, type: String })
  async findAll(@Query('clinic_id') clinicId?: string) {
    return this.userService.findAll(clinicId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiOkResponse({ description: 'User found' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({ description: 'User updated successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }
}
