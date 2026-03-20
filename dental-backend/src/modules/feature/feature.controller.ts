import { Controller, Get, Post, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { FeatureService } from './feature.service.js';
import { CreateFeatureDto } from './dto/index.js';

@ApiTags('Features')
@Controller('features')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post()
  @SuperAdmin()
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiCreatedResponse({ description: 'Feature created successfully' })
  @ApiConflictResponse({ description: 'Feature with this key already exists' })
  async create(@Body() dto: CreateFeatureDto) {
    return this.featureService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all features' })
  @ApiOkResponse({ description: 'List of features' })
  async findAll() {
    return this.featureService.findAll();
  }

  @Delete(':id')
  @SuperAdmin()
  @ApiOperation({ summary: 'Delete a feature flag' })
  @ApiOkResponse({ description: 'Feature deleted successfully' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.featureService.remove(id);
  }
}
