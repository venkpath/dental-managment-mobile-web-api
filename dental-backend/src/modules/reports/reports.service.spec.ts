import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';

const mockPrismaService = {
  appointment: { count: jest.fn() },
  payment: { aggregate: jest.fn() },
  invoice: { count: jest.fn() },
  $queryRaw: jest.fn(),
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardSummary', () => {
    beforeEach(() => {
      mockPrismaService.appointment.count.mockResolvedValue(5);
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 15000.5 },
      });
      mockPrismaService.invoice.count.mockResolvedValue(3);
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: BigInt(2) }]);
    });

    it('should return dashboard summary with all metrics', async () => {
      const result = await service.getDashboardSummary(clinicId);

      expect(result).toEqual({
        today_appointments: 5,
        today_revenue: 15000.5,
        pending_invoices: 3,
        low_inventory_count: 2,
      });
    });

    it('should filter appointments by clinic_id and today date', async () => {
      await service.getDashboardSummary(clinicId);

      expect(mockPrismaService.appointment.count).toHaveBeenCalledWith({
        where: {
          clinic_id: clinicId,
          appointment_date: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should filter payments by clinic_id and today date', async () => {
      await service.getDashboardSummary(clinicId);

      expect(mockPrismaService.payment.aggregate).toHaveBeenCalledWith({
        _sum: { amount: true },
        where: {
          invoice: { clinic_id: clinicId },
          paid_at: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should filter pending invoices by clinic_id', async () => {
      await service.getDashboardSummary(clinicId);

      expect(mockPrismaService.invoice.count).toHaveBeenCalledWith({
        where: {
          clinic_id: clinicId,
          status: 'pending',
        },
      });
    });

    it('should query low inventory items with raw SQL for column comparison', async () => {
      await service.getDashboardSummary(clinicId);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return 0 revenue when no payments exist today', async () => {
      mockPrismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getDashboardSummary(clinicId);

      expect(result.today_revenue).toBe(0);
    });

    it('should return 0 low inventory when query returns empty', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const result = await service.getDashboardSummary(clinicId);

      expect(result.low_inventory_count).toBe(0);
    });

    it('should handle all zero metrics', async () => {
      mockPrismaService.appointment.count.mockResolvedValue(0);
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrismaService.invoice.count.mockResolvedValue(0);
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const result = await service.getDashboardSummary(clinicId);

      expect(result).toEqual({
        today_appointments: 0,
        today_revenue: 0,
        pending_invoices: 0,
        low_inventory_count: 0,
      });
    });
  });
});
