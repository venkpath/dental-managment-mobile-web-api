import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { ClinicService } from './clinic.service.js';
import { CreateClinicDto, UpdateClinicDto } from './dto/index.js';

@ApiTags('Clinics')
@Public()
@Controller('clinics')
export class ClinicController {
  constructor(private readonly clinicService: ClinicService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new clinic' })
  @ApiCreatedResponse({ description: 'Clinic created successfully' })
  async create(@Body() dto: CreateClinicDto) {
    return this.clinicService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all clinics' })
  @ApiOkResponse({ description: 'List of clinics' })
  async findAll() {
    return this.clinicService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a clinic by ID' })
  @ApiOkResponse({ description: 'Clinic found' })
  @ApiNotFoundResponse({ description: 'Clinic not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a clinic' })
  @ApiOkResponse({ description: 'Clinic updated successfully' })
  @ApiNotFoundResponse({ description: 'Clinic not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicDto,
  ) {
    return this.clinicService.update(id, dto);
  }
}
