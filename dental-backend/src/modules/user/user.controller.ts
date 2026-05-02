import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseUUIDPipe, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
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
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('branch_id') branchId?: string,
  ) {
    return this.userService.findAll(clinicId, role, search, branchId);
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user from the clinic' })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async remove(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.remove(clinicId, id);
  }

  @Post(':id/signature')
  @ApiOperation({ summary: 'Upload a signature image for the user (printed on prescription PDFs)' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Signature uploaded' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1 * 1024 * 1024 } }))
  async uploadSignature(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.uploadSignature(clinicId, id, file);
  }

  @Post(':id/profile-photo')
  @ApiOperation({ summary: 'Upload a profile photo for the user (private, served via presigned URL)' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ description: 'Profile photo uploaded' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async uploadProfilePhoto(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.uploadProfilePhoto(clinicId, id, file);
  }

  @Delete(':id/profile-photo')
  @ApiOperation({ summary: 'Remove the profile photo for the user' })
  @ApiOkResponse({ description: 'Profile photo removed' })
  async deleteProfilePhoto(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.deleteProfilePhoto(clinicId, id);
  }
}
