import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InvoiceService } from './invoice.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PaymentMethod, InvoiceStatus } from './dto/index.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';
const patientId = 'bbb22222-cccc-dddd-eeee-ffffffffffff';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const mockInvoice = {
  id: 'inv-11111-2222-3333-4444-555555555555',
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  invoice_number: 'INV-20260307-0001',
  total_amount: 5000.0,
  tax_amount: 900.0,
  discount_amount: 0,
  net_amount: 5900.0,
  gst_number: null,
  tax_breakdown: null,
  status: 'pending',
  created_at: new Date(),
  updated_at: new Date(),
  items: [
    {
      id: 'item-1',
      invoice_id: 'inv-11111-2222-3333-4444-555555555555',
      treatment_id: null,
      description: 'Composite restoration',
      quantity: 1,
      unit_price: 5000.0,
      total_price: 5000.0,
    },
  ],
  payments: [],
  patient: { id: patientId, first_name: 'John', last_name: 'Doe' },
  branch: { id: branchId, name: 'Main Branch' },
};

const mockPayment = {
  id: 'pay-11111',
  invoice_id: mockInvoice.id,
  method: 'upi',
  amount: 5900.0,
  paid_at: new Date(),
};

const mockPrismaService = {
  branch: { findUnique: jest.fn() },
  patient: { findUnique: jest.fn() },
  treatment: { findMany: jest.fn() },
  invoice: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    jest.clearAllMocks();

    mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: patientId, clinic_id: clinicId });
    mockPrismaService.treatment.findMany.mockResolvedValue([]);
    mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
    mockPrismaService.invoice.findMany.mockResolvedValue([mockInvoice]);
    mockPrismaService.invoice.count.mockResolvedValue(1);
    mockPrismaService.invoice.findFirst.mockResolvedValue(null);
    mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);
    mockPrismaService.invoice.update.mockResolvedValue({ ...mockInvoice, status: 'paid' });
    mockPrismaService.payment.create.mockResolvedValue(mockPayment);
    mockPrismaService.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    mockPrismaService.$transaction.mockImplementation((fn: (tx: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      branch_id: branchId,
      patient_id: patientId,
      tax_percentage: 18,
      items: [
        { description: 'Composite restoration', quantity: 1, unit_price: 5000 },
      ],
    };

    it('should create an invoice with calculated totals', async () => {
      const result = await service.create(clinicId, createDto);
      expect(result).toEqual(mockInvoice);
      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinic_id: clinicId,
            invoice_number: expect.stringMatching(/^INV-\d{8}-\d{4}$/),
          }),
        }),
      );
    });

    it('should throw NotFoundException if branch not in clinic', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: otherClinicId });
      await expect(service.create(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if patient not in clinic', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({ id: patientId, clinic_id: otherClinicId });
      await expect(service.create(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should validate treatment IDs belong to clinic', async () => {
      const dtoWithTreatment = {
        ...createDto,
        items: [{ description: 'Test', quantity: 1, unit_price: 100, treatment_id: 'treat-1' }],
      };
      mockPrismaService.treatment.findMany.mockResolvedValueOnce([]);
      await expect(service.create(clinicId, dtoWithTreatment)).rejects.toThrow(NotFoundException);
    });

    it('should apply discount and tax correctly', async () => {
      const dtoWithDiscount = {
        ...createDto,
        discount_amount: 500,
        tax_percentage: 18,
      };
      await service.create(clinicId, dtoWithDiscount);
      // total=5000, discount=500, taxable=4500, tax=810, net=5310
      const createCall = mockPrismaService.invoice.create.mock.calls[0][0];
      expect(Number(createCall.data.total_amount)).toBe(5000);
      expect(Number(createCall.data.discount_amount)).toBe(500);
      expect(Number(createCall.data.tax_amount)).toBe(810);
      expect(Number(createCall.data.net_amount)).toBe(5310);
    });

    it('should generate sequential invoice numbers', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValueOnce({
        invoice_number: 'INV-20260307-0003',
      });
      await service.create(clinicId, createDto);
      const createCall = mockPrismaService.invoice.create.mock.calls[0][0];
      expect(createCall.data.invoice_number).toMatch(/-0004$/);
    });
  });

  describe('findAll', () => {
    it('should return invoices filtered by clinicId with pagination', async () => {
      const result = await service.findAll(clinicId, {});
      expect(result).toEqual({
        data: [mockInvoice],
        meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
      });
    });

    it('should filter by status', async () => {
      await service.findAll(clinicId, { status: InvoiceStatus.PENDING });
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'pending' }),
        }),
      );
    });

    it('should filter by patient_id', async () => {
      await service.findAll(clinicId, { patient_id: patientId });
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ patient_id: patientId }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an invoice belonging to the clinic', async () => {
      const result = await service.findOne(clinicId, mockInvoice.id);
      expect(result).toEqual(mockInvoice);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for different clinic', async () => {
      await expect(service.findOne(otherClinicId, mockInvoice.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addPayment', () => {
    it('should record a payment and auto-mark invoice as paid', async () => {
      const result = await service.addPayment(clinicId, {
        invoice_id: mockInvoice.id,
        method: PaymentMethod.UPI,
        amount: 5900,
      });
      expect(result).toEqual(mockPayment);
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: mockInvoice.id },
        data: { status: 'paid' },
      });
    });

    it('should reject payment if invoice is already paid', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValueOnce({
        ...mockInvoice,
        status: 'paid',
      });
      await expect(
        service.addPayment(clinicId, {
          invoice_id: mockInvoice.id,
          method: PaymentMethod.CASH,
          amount: 100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject payment exceeding remaining balance', async () => {
      mockPrismaService.payment.aggregate.mockResolvedValueOnce({
        _sum: { amount: 5000 },
      });
      await expect(
        service.addPayment(clinicId, {
          invoice_id: mockInvoice.id,
          method: PaymentMethod.CARD,
          amount: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow partial payment without marking as paid', async () => {
      mockPrismaService.payment.aggregate.mockResolvedValueOnce({
        _sum: { amount: null },
      });
      const partialPayment = { ...mockPayment, amount: 1000 };
      mockPrismaService.payment.create.mockResolvedValueOnce(partialPayment);

      await service.addPayment(clinicId, {
        invoice_id: mockInvoice.id,
        method: PaymentMethod.CASH,
        amount: 1000,
      });

      expect(mockPrismaService.invoice.update).not.toHaveBeenCalled();
    });
  });
});
