import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';

const mockPrismaService = {
  appointment: { count: jest.fn() },
  payment: { aggregate: jest.fn() },
  invoice: { count: jest.fn(), aggregate: jest.fn() },
  patient: { count: jest.fn() },
  expense: { aggregate: jest.fn() },
  refund: { aggregate: jest.fn() },
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
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { net_amount: 2000 },
      });
      mockPrismaService.expense.aggregate.mockResolvedValue({
        _sum: { amount: 5000 },
      });
      mockPrismaService.refund.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: BigInt(2) }]);
    });

    it('should return dashboard summary with all metrics', async () => {
      const result = await service.getDashboardSummary(clinicId);

      expect(result).toEqual({
        today_appointments: 5,
        today_revenue: 15000.5,
        pending_invoices: 3,
        outstanding_amount: expect.any(Number),
        low_inventory_count: 2,
        this_month_expenses: 5000,
        this_month_revenue: 15000.5,
        this_month_refunds: 0,
        net_profit: 15000.5 - 5000,
      });
    });

    it('should filter appointments by clinic_id and today date', async () => {
      await service.getDashboardSummary(clinicId);

      expect(mockPrismaService.appointment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinic_id: clinicId,
            appointment_date: {
              gte: expect.any(Date),
              lt: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should filter payments by clinic_id and today date', async () => {
      await service.getDashboardSummary(clinicId);

      expect(mockPrismaService.payment.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          _sum: { amount: true },
          where: expect.objectContaining({
            invoice: expect.objectContaining({ clinic_id: clinicId }),
            paid_at: {
              gte: expect.any(Date),
              lt: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('should filter pending invoices by clinic_id', async () => {
      await service.getDashboardSummary(clinicId);

      expect(mockPrismaService.invoice.count).toHaveBeenCalledWith({
        where: {
          clinic_id: clinicId,
          status: { in: ['pending', 'partially_paid'] },
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
      mockPrismaService.invoice.aggregate.mockResolvedValue({ _sum: { net_amount: null } });
      mockPrismaService.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrismaService.refund.aggregate.mockResolvedValue({ _sum: { amount: null } });
      mockPrismaService.$queryRaw.mockResolvedValue([{ count: BigInt(0) }]);

      const result = await service.getDashboardSummary(clinicId);

      expect(result).toEqual({
        today_appointments: 0,
        today_revenue: 0,
        pending_invoices: 0,
        outstanding_amount: 0,
        low_inventory_count: 0,
        this_month_expenses: 0,
        this_month_revenue: 0,
        this_month_refunds: 0,
        net_profit: 0,
      });
    });
  });

  describe('getRevenueReport', () => {
    const baseQuery = { start_date: '2026-03-01', end_date: '2026-03-31' };

    beforeEach(() => {
      // invoice.aggregate called 3x: paid, partially_paid, pending
      mockPrismaService.invoice.aggregate
        .mockResolvedValueOnce({ _sum: { net_amount: 50000, tax_amount: 9000, discount_amount: 2000 } })
        .mockResolvedValueOnce({ _sum: { net_amount: 0, tax_amount: 0, discount_amount: 0 } })
        .mockResolvedValueOnce({ _sum: { net_amount: 5000 } });
      // invoice.count called 3x: pending, paid, partially_paid
      mockPrismaService.invoice.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      // payment.aggregate called once for total collected
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: 50000 } });
    });

    it('should return revenue report with all metrics', async () => {
      const result = await service.getRevenueReport(clinicId, baseQuery);

      expect(result).toEqual({
        total_revenue: 50000,
        paid_invoices: 10,
        pending_invoices: 3,
        partially_paid_invoices: 0,
        outstanding_amount: expect.any(Number),
        tax_collected: 9000,
        discount_given: 2000,
      });
    });

    it('should filter by clinic_id and date range', async () => {
      await service.getRevenueReport(clinicId, baseQuery);

      expect(mockPrismaService.invoice.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          _sum: { net_amount: true, tax_amount: true, discount_amount: true },
          where: expect.objectContaining({
            clinic_id: clinicId,
            created_at: { gte: expect.any(Date), lte: expect.any(Date) },
            status: 'paid',
          }),
        }),
      );
    });

    it('should include branch_id filter when provided', async () => {
      const branchId = '223e4567-e89b-12d3-a456-426614174000';
      await service.getRevenueReport(clinicId, { ...baseQuery, branch_id: branchId });

      expect(mockPrismaService.invoice.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinic_id: clinicId,
            branch_id: branchId,
            status: 'paid',
          }),
        }),
      );
    });

    it('should include dentist_id filter via treatment relation when provided', async () => {
      const dentistId = '333e4567-e89b-12d3-a456-426614174000';
      await service.getRevenueReport(clinicId, { ...baseQuery, dentist_id: dentistId });

      expect(mockPrismaService.invoice.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinic_id: clinicId,
            items: { some: { treatment: { dentist_id: dentistId } } },
            status: 'paid',
          }),
        }),
      );
    });

    it('should return zeros when no paid invoices exist', async () => {
      mockPrismaService.invoice.aggregate
        .mockReset()
        .mockResolvedValue({ _sum: { net_amount: null, tax_amount: null, discount_amount: null } });
      mockPrismaService.invoice.count
        .mockReset()
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await service.getRevenueReport(clinicId, baseQuery);

      expect(result).toEqual({
        total_revenue: 0,
        paid_invoices: 0,
        pending_invoices: 5,
        partially_paid_invoices: 0,
        outstanding_amount: 0,
        tax_collected: 0,
        discount_given: 0,
      });
    });

    it('should apply both branch_id and dentist_id filters together', async () => {
      const branchId = '223e4567-e89b-12d3-a456-426614174000';
      const dentistId = '333e4567-e89b-12d3-a456-426614174000';
      await service.getRevenueReport(clinicId, { ...baseQuery, branch_id: branchId, dentist_id: dentistId });

      expect(mockPrismaService.invoice.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinic_id: clinicId,
            branch_id: branchId,
            items: { some: { treatment: { dentist_id: dentistId } } },
            status: 'paid',
          }),
        }),
      );
    });
  });

  describe('getAppointmentAnalytics', () => {
    const baseQuery = { start_date: '2026-03-01', end_date: '2026-03-31' };

    beforeEach(() => {
      mockPrismaService.appointment.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(12) // completed
        .mockResolvedValueOnce(5)  // cancelled
        .mockResolvedValueOnce(3); // no_show
    });

    it('should return appointment analytics with all status counts', async () => {
      const result = await service.getAppointmentAnalytics(clinicId, baseQuery);

      expect(result).toEqual({
        total_appointments: 20,
        completed: 12,
        cancelled: 5,
        no_show: 3,
      });
    });

    it('should filter by clinic_id and date range', async () => {
      await service.getAppointmentAnalytics(clinicId, baseQuery);

      expect(mockPrismaService.appointment.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clinic_id: clinicId,
          appointment_date: { gte: expect.any(Date), lte: expect.any(Date) },
        }),
      });
    });

    it('should include branch_id filter when provided', async () => {
      const branchId = '223e4567-e89b-12d3-a456-426614174000';
      await service.getAppointmentAnalytics(clinicId, { ...baseQuery, branch_id: branchId });

      expect(mockPrismaService.appointment.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clinic_id: clinicId,
          branch_id: branchId,
        }),
      });
    });

    it('should include dentist_id filter when provided', async () => {
      const dentistId = '333e4567-e89b-12d3-a456-426614174000';
      await service.getAppointmentAnalytics(clinicId, { ...baseQuery, dentist_id: dentistId });

      expect(mockPrismaService.appointment.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clinic_id: clinicId,
          dentist_id: dentistId,
        }),
      });
    });

    it('should query each status separately', async () => {
      await service.getAppointmentAnalytics(clinicId, baseQuery);

      expect(mockPrismaService.appointment.count).toHaveBeenCalledTimes(4);
      // completed
      expect(mockPrismaService.appointment.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'completed' }),
      });
      // cancelled
      expect(mockPrismaService.appointment.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'cancelled' }),
      });
      // no_show
      expect(mockPrismaService.appointment.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: 'no_show' }),
      });
    });

    it('should return zeros when no appointments exist', async () => {
      mockPrismaService.appointment.count
        .mockReset()
        .mockResolvedValue(0);

      const result = await service.getAppointmentAnalytics(clinicId, baseQuery);

      expect(result).toEqual({
        total_appointments: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      });
    });
  });

  describe('getDentistPerformance', () => {
    const baseQuery = { start_date: '2026-03-01', end_date: '2026-03-31' };

    const mockRawResults = [
      {
        dentist_id: 'dentist-1',
        dentist_name: 'Dr. Rahul Verma',
        appointments_handled: BigInt(15),
        treatments_performed: BigInt(10),
        revenue_generated: 25000,
      },
      {
        dentist_id: 'dentist-2',
        dentist_name: 'Dr. Anjali Patel',
        appointments_handled: BigInt(12),
        treatments_performed: BigInt(8),
        revenue_generated: 18000,
      },
    ];

    beforeEach(() => {
      mockPrismaService.$queryRaw.mockResolvedValue(mockRawResults);
    });

    it('should return performance metrics for all dentists', async () => {
      const result = await service.getDentistPerformance(clinicId, baseQuery);

      expect(result).toEqual([
        {
          dentist_id: 'dentist-1',
          dentist_name: 'Dr. Rahul Verma',
          appointments_handled: 15,
          treatments_performed: 10,
          revenue_generated: 25000,
        },
        {
          dentist_id: 'dentist-2',
          dentist_name: 'Dr. Anjali Patel',
          appointments_handled: 12,
          treatments_performed: 8,
          revenue_generated: 18000,
        },
      ]);
    });

    it('should call $queryRaw with clinic_id parameter', async () => {
      await service.getDentistPerformance(clinicId, baseQuery);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return empty array when no dentists exist', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getDentistPerformance(clinicId, baseQuery);

      expect(result).toEqual([]);
    });

    it('should convert BigInt values to numbers', async () => {
      const result = await service.getDentistPerformance(clinicId, baseQuery);

      expect(typeof result[0].appointments_handled).toBe('number');
      expect(typeof result[0].treatments_performed).toBe('number');
      expect(typeof result[0].revenue_generated).toBe('number');
    });

    it('should handle null revenue_generated', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          dentist_id: 'dentist-1',
          dentist_name: 'Dr. New',
          appointments_handled: BigInt(0),
          treatments_performed: BigInt(0),
          revenue_generated: null,
        },
      ]);

      const result = await service.getDentistPerformance(clinicId, baseQuery);

      expect(result[0].revenue_generated).toBe(0);
    });

    it('should pass branch_id filter when provided', async () => {
      const branchId = '223e4567-e89b-12d3-a456-426614174000';
      await service.getDentistPerformance(clinicId, { ...baseQuery, branch_id: branchId });

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('getPatientAnalytics', () => {
    const baseQuery = { start_date: '2026-03-01', end_date: '2026-03-31' };

    beforeEach(() => {
      mockPrismaService.patient.count
        .mockResolvedValueOnce(15) // new_patients
        .mockResolvedValueOnce(200) // total_patients
        .mockResolvedValueOnce(30); // returning_patients
    });

    it('should return patient analytics with all metrics', async () => {
      const result = await service.getPatientAnalytics(clinicId, baseQuery);

      expect(result).toEqual({
        new_patients: 15,
        returning_patients: 30,
        total_patients: 200,
      });
    });

    it('should filter new patients by created_at date range', async () => {
      await service.getPatientAnalytics(clinicId, baseQuery);

      expect(mockPrismaService.patient.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clinic_id: clinicId,
          created_at: { gte: expect.any(Date), lte: expect.any(Date) },
        }),
      });
    });

    it('should count returning patients created before start_date with appointments in range', async () => {
      await service.getPatientAnalytics(clinicId, baseQuery);

      expect(mockPrismaService.patient.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clinic_id: clinicId,
          created_at: { lt: expect.any(Date) },
          appointments: {
            some: {
              appointment_date: { gte: expect.any(Date), lte: expect.any(Date) },
            },
          },
        }),
      });
    });

    it('should include branch_id filter when provided', async () => {
      const branchId = '223e4567-e89b-12d3-a456-426614174000';
      await service.getPatientAnalytics(clinicId, { ...baseQuery, branch_id: branchId });

      expect(mockPrismaService.patient.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          clinic_id: clinicId,
          branch_id: branchId,
        }),
      });
    });

    it('should return zeros when no patients exist', async () => {
      mockPrismaService.patient.count
        .mockReset()
        .mockResolvedValue(0);

      const result = await service.getPatientAnalytics(clinicId, baseQuery);

      expect(result).toEqual({
        new_patients: 0,
        returning_patients: 0,
        total_patients: 0,
      });
    });
  });

  describe('getTreatmentAnalytics', () => {
    const baseQuery = { start_date: '2026-03-01', end_date: '2026-03-31' };

    const mockProcedures = [
      { procedure: 'Root Canal Treatment', count: BigInt(25) },
      { procedure: 'Dental Filling', count: BigInt(18) },
      { procedure: 'Tooth Extraction', count: BigInt(12) },
    ];

    beforeEach(() => {
      mockPrismaService.$queryRaw.mockResolvedValue(mockProcedures);
    });

    it('should return treatment analytics with procedure breakdown', async () => {
      const result = await service.getTreatmentAnalytics(clinicId, baseQuery);

      expect(result).toEqual({
        most_common_procedures: [
          { procedure: 'Root Canal Treatment', count: 25 },
          { procedure: 'Dental Filling', count: 18 },
          { procedure: 'Tooth Extraction', count: 12 },
        ],
        procedure_counts: 3,
      });
    });

    it('should call $queryRaw for procedure grouping', async () => {
      await service.getTreatmentAnalytics(clinicId, baseQuery);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return empty when no treatments exist', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getTreatmentAnalytics(clinicId, baseQuery);

      expect(result).toEqual({
        most_common_procedures: [],
        procedure_counts: 0,
      });
    });

    it('should convert BigInt counts to numbers', async () => {
      const result = await service.getTreatmentAnalytics(clinicId, baseQuery);

      result.most_common_procedures.forEach((p) => {
        expect(typeof p.count).toBe('number');
      });
    });

    it('should pass branch_id filter when provided', async () => {
      const branchId = '223e4567-e89b-12d3-a456-426614174000';
      await service.getTreatmentAnalytics(clinicId, { ...baseQuery, branch_id: branchId });

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should pass dentist_id filter when provided', async () => {
      const dentistId = '333e4567-e89b-12d3-a456-426614174000';
      await service.getTreatmentAnalytics(clinicId, { ...baseQuery, dentist_id: dentistId });

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('getInventoryAlerts', () => {
    const mockAlertItems = [
      {
        id: 'item-1',
        name: 'Dental Gloves',
        category: 'PPE',
        quantity: 5,
        reorder_level: 50,
        unit: 'boxes',
        branch_id: 'branch-1',
      },
      {
        id: 'item-2',
        name: 'Composite Resin',
        category: 'Materials',
        quantity: 2,
        reorder_level: 10,
        unit: 'tubes',
        branch_id: 'branch-1',
      },
    ];

    beforeEach(() => {
      mockPrismaService.$queryRaw.mockResolvedValue(mockAlertItems);
    });

    it('should return low-stock inventory items', async () => {
      const result = await service.getInventoryAlerts(clinicId);

      expect(result).toEqual(mockAlertItems);
      expect(result).toHaveLength(2);
    });

    it('should call $queryRaw for column comparison', async () => {
      await service.getInventoryAlerts(clinicId);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return empty array when no low-stock items', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getInventoryAlerts(clinicId);

      expect(result).toEqual([]);
    });

    it('should pass branch_id filter when provided', async () => {
      const branchId = '223e4567-e89b-12d3-a456-426614174000';
      await service.getInventoryAlerts(clinicId, branchId);

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should include item details in response', async () => {
      const result = await service.getInventoryAlerts(clinicId);

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('quantity');
      expect(result[0]).toHaveProperty('reorder_level');
      expect(result[0]).toHaveProperty('unit');
    });
  });
});
