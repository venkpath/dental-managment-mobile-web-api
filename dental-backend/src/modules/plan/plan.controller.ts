import { Controller, Get, Post, Patch, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { PlanService } from './plan.service.js';
import { CreatePlanDto, UpdatePlanDto, AssignFeaturesDto } from './dto/index.js';

@ApiTags('Plans')
@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @SuperAdmin()
  @ApiOperation({ summary: 'Create a new subscription plan' })
  @ApiCreatedResponse({ description: 'Plan created successfully' })
  @ApiConflictResponse({ description: 'Plan with this name already exists' })
  async create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all subscription plans' })
  @ApiOkResponse({ description: 'List of plans' })
  async findAll() {
    return this.planService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a plan by ID' })
  @ApiOkResponse({ description: 'Plan found' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.findOne(id);
  }

  @Patch(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Update a subscription plan' })
  @ApiOkResponse({ description: 'Plan updated successfully' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  @ApiConflictResponse({ description: 'Plan with this name already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.planService.update(id, dto);
  }

  @Post(':id/features')
  @SuperAdmin()
  @ApiOperation({ summary: 'Assign features to a plan' })
  @ApiOkResponse({ description: 'Features assigned successfully' })
  @ApiNotFoundResponse({ description: 'Plan or feature not found' })
  async assignFeatures(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignFeaturesDto,
  ) {
    return this.planService.assignFeatures(id, dto);
  }

  @Get(':id/features')
  @SuperAdmin()
  @ApiOperation({ summary: 'Get features assigned to a plan' })
  @ApiOkResponse({ description: 'List of plan features' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async getFeatures(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.getFeatures(id);
  }

  @Delete(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Delete a subscription plan' })
  @ApiOkResponse({ description: 'Plan deleted successfully' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.remove(id);
  }
}
