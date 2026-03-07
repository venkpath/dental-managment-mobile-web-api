import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const mockItem = {
  id: 'ccc33333-dddd-eeee-ffff-111111111111',
  clinic_id: clinicId,
  branch_id: branchId,
  name: 'Dental Gloves',
  category: 'Consumables',
  quantity: 100,
  unit: 'box',
  reorder_level: 10,
  supplier: 'MedSupply Co.',
  created_at: new Date(),
  updated_at: new Date(),
  branch: { id: branchId, name: 'Main Branch' },
};

const mockPrismaService = {
  branch: {
    findUnique: jest.fn(),
  },
  inventoryItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    jest.clearAllMocks();
    mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrismaService.inventoryItem.findUnique.mockResolvedValue(mockItem);
    mockPrismaService.inventoryItem.findMany.mockResolvedValue([mockItem]);
    mockPrismaService.inventoryItem.count.mockResolvedValue(1);
    mockPrismaService.inventoryItem.create.mockResolvedValue(mockItem);
    mockPrismaService.inventoryItem.update.mockResolvedValue({ ...mockItem, quantity: 200 });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      branch_id: branchId,
      name: 'Dental Gloves',
      category: 'Consumables',
      quantity: 100,
      unit: 'box',
      reorder_level: 10,
      supplier: 'MedSupply Co.',
    };

    it('should create an inventory item scoped to clinic', async () => {
      const result = await service.create(clinicId, createDto);
      expect(result).toEqual(mockItem);
      expect(mockPrismaService.branch.findUnique).toHaveBeenCalledWith({
        where: { id: branchId },
      });
      expect(mockPrismaService.inventoryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinic_id: clinicId,
          branch_id: branchId,
          name: 'Dental Gloves',
        }),
      });
    });

    it('should throw NotFoundException if branch does not belong to clinic', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: otherClinicId });
      await expect(service.create(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if branch does not exist', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return items filtered by clinicId with pagination', async () => {
      const result = await service.findAll(clinicId, {});
      expect(result).toEqual({
        data: [mockItem],
        meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
      });
      expect(mockPrismaService.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinic_id: clinicId },
          skip: 0,
          take: 20,
        }),
      );
      expect(mockPrismaService.inventoryItem.count).toHaveBeenCalled();
    });

    it('should filter by branch_id when provided', async () => {
      await service.findAll(clinicId, { branch_id: branchId });
      expect(mockPrismaService.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branch_id: branchId,
          }),
        }),
      );
    });

    it('should filter by name when provided', async () => {
      await service.findAll(clinicId, { name: 'Gloves' });
      expect(mockPrismaService.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Gloves', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by category when provided', async () => {
      await service.findAll(clinicId, { category: 'Consumables' });
      expect(mockPrismaService.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { contains: 'Consumables', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter low stock items (quantity <= reorder_level)', async () => {
      const lowStockItem = { ...mockItem, quantity: 5, reorder_level: 10 };
      const inStockItem = { ...mockItem, id: 'other-id', quantity: 50, reorder_level: 10 };
      mockPrismaService.inventoryItem.findMany.mockResolvedValueOnce([lowStockItem, inStockItem]);

      const result = await service.findAll(clinicId, { low_stock: 'true' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].quantity).toBe(5);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return an item when it belongs to the clinic', async () => {
      const result = await service.findOne(clinicId, mockItem.id);
      expect(result).toEqual(mockItem);
    });

    it('should throw NotFoundException when item not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when item belongs to different clinic', async () => {
      await expect(service.findOne(otherClinicId, mockItem.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an inventory item within the same clinic', async () => {
      const result = await service.update(clinicId, mockItem.id, { quantity: 200 });
      expect(result.quantity).toBe(200);
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: mockItem.id },
        data: { quantity: 200 },
        include: { branch: true },
      });
    });

    it('should throw NotFoundException when updating item from different clinic', async () => {
      await expect(
        service.update(otherClinicId, mockItem.id, { quantity: 999 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
