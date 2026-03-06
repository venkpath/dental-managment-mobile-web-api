import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiHeader,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { BranchService } from './branch.service.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Branches')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new branch for the current clinic' })
  @ApiCreatedResponse({ description: 'Branch created successfully' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.branchService.create(clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all branches for the current clinic' })
  @ApiOkResponse({ description: 'List of branches' })
  async findAll(@CurrentClinic() clinicId: string) {
    return this.branchService.findAll(clinicId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a branch by ID' })
  @ApiOkResponse({ description: 'Branch found' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.branchService.findOne(clinicId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiOkResponse({ description: 'Branch updated successfully' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(clinicId, id, dto);
  }
}
