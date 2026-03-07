import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateInventoryItemDto, UpdateInventoryItemDto, QueryInventoryItemDto } from './dto/index.js';
import { InventoryItem, Prisma } from '@prisma/client';
import { PaginatedResult, paginate } from '../../common/interfaces/paginated-result.interface.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(clinicId: string, dto: CreateInventoryItemDto): Promise<InventoryItem> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branch_id },
    });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${dto.branch_id}" not found in this clinic`);
    }

    return this.prisma.inventoryItem.create({
      data: {
        ...dto,
        clinic_id: clinicId,
      },
    });
  }

  async findAll(clinicId: string, query: QueryInventoryItemDto): Promise<PaginatedResult<InventoryItem>> {
    const where: Prisma.InventoryItemWhereInput = { clinic_id: clinicId };

    if (query.branch_id) {
      where.branch_id = query.branch_id;
    }

    if (query.name) {
      where.name = { contains: query.name, mode: 'insensitive' };
    }

    if (query.category) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (query.low_stock === 'true') {
      // Prisma doesn't support column-to-column comparison, so fetch all and post-filter
      const allItems = await this.prisma.inventoryItem.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { branch: true },
      });
      const filtered = allItems.filter((item) => item.quantity <= item.reorder_level);
      const paged = filtered.slice((page - 1) * limit, page * limit);
      return paginate(paged, filtered.length, page, limit);
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: { branch: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(clinicId: string, id: string): Promise<InventoryItem> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: { branch: true },
    });
    if (!item || item.clinic_id !== clinicId) {
      throw new NotFoundException(`Inventory item with ID "${id}" not found`);
    }
    return item;
  }

  async update(clinicId: string, id: string, dto: UpdateInventoryItemDto): Promise<InventoryItem> {
    await this.findOne(clinicId, id);

    return this.prisma.inventoryItem.update({
      where: { id },
      data: { ...dto },
      include: { branch: true },
    });
  }
}
