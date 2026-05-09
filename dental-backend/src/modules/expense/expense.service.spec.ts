import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExpenseService } from './expense.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = 'clinic-uuid-0001';
const userId = 'user-uuid-0001';
const categoryId = 'cat-uuid-0001';
const expenseId = 'exp-uuid-0001';
const branchId = 'branch-uuid-0001';

const mockCategory = { id: categoryId, clinic_id: clinicId, name: 'Rent', icon: 'building', is_default: false, is_active: true };
const mockBranch = { id: branchId, clinic_id: clinicId };

const mockExpense = {
  id: expenseId,
  clinic_id: clinicId,
  category_id: categoryId,
  title: 'Monthly Rent',
  amount: 50000,
  date: new Date('2026-01-01'),
  payment_mode: 'bank_transfer',
  category: mockCategory,
  branch: null,
  user: { id: userId, name: 'Admin' },
};

const mockPrisma = {
  expenseCategory: {
    count: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  expense: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  branch: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

describe('ExpenseService', () => {
  let service: ExpenseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    mockPrisma.expenseCategory.count.mockResolvedValue(1);
    mockPrisma.expenseCategory.createMany.mockResolvedValue({ count: 0 });
    mockPrisma.expenseCategory.findMany.mockResolvedValue([mockCategory]);
    mockPrisma.expenseCategory.create.mockResolvedValue(mockCategory);
    mockPrisma.expenseCategory.findUnique.mockResolvedValue(mockCategory);
    mockPrisma.expenseCategory.update.mockResolvedValue(mockCategory);
    mockPrisma.expenseCategory.delete.mockResolvedValue(mockCategory);
    mockPrisma.expense.create.mockResolvedValue(mockExpense);
    mockPrisma.expense.findMany.mockResolvedValue([mockExpense]);
    mockPrisma.expense.findUnique.mockResolvedValue(mockExpense);
    mockPrisma.expense.update.mockResolvedValue(mockExpense);
    mockPrisma.expense.delete.mockResolvedValue(mockExpense);
    mockPrisma.expense.count.mockResolvedValue(1);
    mockPrisma.branch.findUnique.mockResolvedValue(mockBranch);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Expense Categories ───────────────────────────────────────

  describe('seedDefaultCategories', () => {
    it('should skip seeding when defaults already exist', async () => {
      mockPrisma.expenseCategory.count.mockResolvedValue(5);
      await service.seedDefaultCategories(clinicId);
      expect(mockPrisma.expenseCategory.createMany).not.toHaveBeenCalled();
    });

    it('should seed defaults when none exist', async () => {
      mockPrisma.expenseCategory.count.mockResolvedValue(0);
      await service.seedDefaultCategories(clinicId);
      expect(mockPrisma.expenseCategory.createMany).toHaveBeenCalled();
    });
  });

  describe('findAllCategories', () => {
    it('should return active categories with auto-seed', async () => {
      const result = await service.findAllCategories(clinicId);
      expect(result).toEqual([mockCategory]);
    });

    it('should include inactive categories when flag set', async () => {
      await service.findAllCategories(clinicId, true);
      expect(mockPrisma.expenseCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clinic_id: clinicId } }),
      );
    });
  });

  describe('createCategory', () => {
    it('should create a non-default category', async () => {
      const result = await service.createCategory(clinicId, { name: 'Lab Fees', icon: 'flask' });
      expect(result).toEqual(mockCategory);
    });
  });

  describe('updateCategory', () => {
    it('should update a category belonging to the clinic', async () => {
      const result = await service.updateCategory(clinicId, categoryId, { name: 'Updated Name' });
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.expenseCategory.findUnique.mockResolvedValueOnce(null);
      await expect(service.updateCategory(clinicId, categoryId, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when category belongs to different clinic', async () => {
      mockPrisma.expenseCategory.findUnique.mockResolvedValueOnce({ ...mockCategory, clinic_id: 'other' });
      await expect(service.updateCategory(clinicId, categoryId, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a non-default category with no expenses', async () => {
      mockPrisma.expense.count.mockResolvedValueOnce(0);
      await service.deleteCategory(clinicId, categoryId);
      expect(mockPrisma.expenseCategory.delete).toHaveBeenCalledWith({ where: { id: categoryId } });
    });

    it('should throw BadRequestException when deleting a default category', async () => {
      mockPrisma.expenseCategory.findUnique.mockResolvedValueOnce({ ...mockCategory, is_default: true });
      await expect(service.deleteCategory(clinicId, categoryId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when category has expenses', async () => {
      mockPrisma.expense.count.mockResolvedValueOnce(3);
      await expect(service.deleteCategory(clinicId, categoryId)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.expenseCategory.findUnique.mockResolvedValueOnce(null);
      await expect(service.deleteCategory(clinicId, categoryId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Expenses ─────────────────────────────────────────────────

  describe('create', () => {
    const dto = { category_id: categoryId, title: 'Rent', amount: 50000, date: '2026-01-01', payment_mode: 'cash' };

    it('should create an expense', async () => {
      const result = await service.create(clinicId, userId, dto as any);
      expect(result).toEqual(mockExpense);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.expenseCategory.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(clinicId, userId, dto as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when category is inactive', async () => {
      mockPrisma.expenseCategory.findUnique.mockResolvedValueOnce({ ...mockCategory, is_active: false });
      await expect(service.create(clinicId, userId, dto as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when branch not in clinic', async () => {
      mockPrisma.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: 'other' });
      await expect(service.create(clinicId, userId, { ...dto, branch_id: branchId } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated expenses', async () => {
      const result = await service.findAll(clinicId, {});
      expect(result.data).toEqual([mockExpense]);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by category_id', async () => {
      await service.findAll(clinicId, { category_id: categoryId });
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category_id: categoryId }) }),
      );
    });

    it('should filter by date range', async () => {
      await service.findAll(clinicId, { start_date: '2026-01-01', end_date: '2026-01-31' });
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ date: expect.any(Object) }) }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an expense belonging to the clinic', async () => {
      const result = await service.findOne(clinicId, expenseId);
      expect(result).toEqual(mockExpense);
    });

    it('should throw NotFoundException when expense not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, expenseId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when expense belongs to different clinic', async () => {
      mockPrisma.expense.findUnique.mockResolvedValueOnce({ ...mockExpense, clinic_id: 'other' });
      await expect(service.findOne(clinicId, expenseId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an expense', async () => {
      const result = await service.update(clinicId, expenseId, { title: 'Updated Rent' } as any);
      expect(result).toEqual(mockExpense);
    });

    it('should validate new category when category_id changes', async () => {
      mockPrisma.expenseCategory.findUnique.mockResolvedValueOnce({ ...mockCategory, clinic_id: 'other' });
      await expect(
        service.update(clinicId, expenseId, { category_id: 'other-cat' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an expense', async () => {
      await service.remove(clinicId, expenseId);
      expect(mockPrisma.expense.delete).toHaveBeenCalledWith({ where: { id: expenseId } });
    });

    it('should throw NotFoundException when expense not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove(clinicId, expenseId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Summary / Reports ────────────────────────────────────────

  describe('getSummary', () => {
    it('should return expense summary with category breakdown', async () => {
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 50000 }, _count: 1 });
      mockPrisma.expense.groupBy.mockResolvedValue([{ category_id: categoryId, _sum: { amount: 50000 }, _count: 1 }]);
      mockPrisma.expenseCategory.findMany.mockResolvedValue([{ id: categoryId, name: 'Rent', icon: 'building' }]);

      const result = await service.getSummary(clinicId, { start_date: '2026-01-01', end_date: '2026-01-31' });
      expect(result.total_expenses).toBe(50000);
      expect(result.by_category).toHaveLength(1);
    });
  });

  describe('getMonthlyTrend', () => {
    it('should return monthly expense trend for the last N months', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([
        { amount: 50000, date: new Date('2026-01-15') },
      ]);
      const result = await service.getMonthlyTrend(clinicId, 3);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });
  });
});
