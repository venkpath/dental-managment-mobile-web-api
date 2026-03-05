import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { BranchService } from './branch.service.js';
import { CreateBranchDto, UpdateBranchDto } from './dto/index.js';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new branch for a clinic' })
  @ApiCreatedResponse({ description: 'Branch created successfully' })
  @ApiNotFoundResponse({ description: 'Clinic not found' })
  async create(@Body() dto: CreateBranchDto) {
    return this.branchService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all branches' })
  @ApiOkResponse({ description: 'List of branches with clinic info' })
  async findAll() {
    return this.branchService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a branch by ID' })
  @ApiOkResponse({ description: 'Branch found' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a branch' })
  @ApiOkResponse({ description: 'Branch updated successfully' })
  @ApiNotFoundResponse({ description: 'Branch not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(id, dto);
  }
}
