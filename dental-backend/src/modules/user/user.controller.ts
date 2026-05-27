import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, ParseUUIDPipe, UseGuards, UseInterceptors, UploadedFile, ForbiddenException, BadRequestException } from '@nestjs/common';
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
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min, ValidateNested, ValidateIf, registerDecorator, ValidationOptions } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service.js';
import { CreateUserDto, UpdateUserDto, UserRole } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';

function IsAfter(siblingProp: string, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfter',
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName} must be after ${siblingProp}`, ...options },
      constraints: [siblingProp],
      validator: {
        validate(value: unknown, args) {
          if (!args) return true;
          const sibling = (args.object as Record<string, unknown>)[args.constraints[0]];
          if (typeof value !== 'string' || typeof sibling !== 'string') return true;
          return value > sibling;
        },
      },
    });
  };
}

class AvailabilityDayDto {
  @ApiProperty({ example: 1, description: '1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat 7=Sun' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  day_of_week!: number;

  @ApiProperty({ example: '09:00' })
  @ValidateIf((o: AvailabilityDayDto) => !o.is_day_off)
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'start_time must be HH:mm' })
  start_time!: string;

  @ApiProperty({ example: '18:00' })
  @ValidateIf((o: AvailabilityDayDto) => !o.is_day_off)
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'end_time must be HH:mm' })
  @IsAfter('start_time')
  end_time!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  is_day_off?: boolean;
}

class UpsertAvailabilityDto {
  @ApiProperty({ type: [AvailabilityDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityDayDto)
  schedule!: AvailabilityDayDto[];
}

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
    @CurrentUser() requestingUser: JwtPayload,
    @Body() dto: CreateUserDto,
  ) {
    // Only SuperAdmin can assign the SuperAdmin role
    if (dto.role === UserRole.SUPER_ADMIN && requestingUser.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only a SuperAdmin can create another SuperAdmin');
    }
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

  @Get(':id/availability')
  @ApiOperation({ summary: 'Get weekly availability schedule for a doctor' })
  @ApiOkResponse({ description: '7-day schedule (days without a row use branch fallback)' })
  async getAvailability(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.getAvailability(clinicId, id);
  }

  @Put(':id/availability')
  @ApiOperation({ summary: 'Upsert weekly availability schedule for a doctor' })
  @ApiOkResponse({ description: 'Schedule saved' })
  async upsertAvailability(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertAvailabilityDto,
  ) {
    if (!dto.schedule?.length) throw new BadRequestException('schedule must be a non-empty array');
    return this.userService.upsertAvailability(clinicId, id, dto.schedule);
  }
}
