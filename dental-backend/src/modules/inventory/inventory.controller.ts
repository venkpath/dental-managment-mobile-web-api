import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiHeader,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service.js';
import { CreateInventoryItemDto, UpdateInventoryItemDto, QueryInventoryItemDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Inventory')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({ summary: 'Add a new inventory item' })
  @ApiCreatedResponse({ description: 'Inventory item created successfully' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateInventoryItemDto,
  ) {
    return this.inventoryService.create(clinicId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List inventory items with optional filters' })
  @ApiOkResponse({ description: 'List of inventory items' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryInventoryItemDto,
  ) {
    return this.inventoryService.findAll(clinicId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an inventory item by ID' })
  @ApiOkResponse({ description: 'Inventory item found' })
  @ApiNotFoundResponse({ description: 'Inventory item not found' })
  async findOne(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.findOne(clinicId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an inventory item' })
  @ApiOkResponse({ description: 'Inventory item updated successfully' })
  @ApiNotFoundResponse({ description: 'Inventory item not found' })
  async update(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
  ) {
    return this.inventoryService.update(clinicId, id, dto);
  }
}
