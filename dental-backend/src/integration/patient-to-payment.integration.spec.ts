import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PatientService } from '../modules/patient/patient.service.js';
import { AppointmentService } from '../modules/appointment/appointment.service.js';
import { TreatmentService } from '../modules/treatment/treatment.service.js';
import { InvoiceService } from '../modules/invoice/invoice.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '@prisma/client';

/**
 * Integration Test: Patient → Appointment → Treatment → Invoice → Payment
 *
 * Tests the full dental clinic workflow using mocked Prisma to verify
 * cross-service data flow and business logic.
 */

// ----- Shared IDs -----
const clinicId = '11111111-1111-1111-1111-111111111111';
const clinicIdB = '22222222-2222-2222-2222-222222222222';
const branchId = 'aaaa1111-bbbb-cccc-dddd-eeeeeeeeeeee';
const branchIdB = 'aaaa2222-bbbb-cccc-dddd-eeeeeeeeeeee';
const dentistId = 'dddd1111-eeee-ffff-0000-111111111111';
const patientId = 'pppp1111-2222-3333-4444-555555555555';
const appointmentId = 'appt1111-2222-3333-4444-555555555555';
const treatmentId = 'trmt1111-2222-3333-4444-555555555555';
const invoiceId = 'invc1111-2222-3333-4444-555555555555';
const paymentId = 'pymt1111-2222-3333-4444-555555555555';

// ----- Mock Data -----
const mockBranch = { id: branchId, clinic_id: clinicId, name: 'Main Branch' };
const mockBranchB = { id: branchIdB, clinic_id: clinicIdB, name: 'Other Clinic Branch' };
const mockDentist = { id: dentistId, clinic_id: clinicId, name: 'Dr. Sharma', role: 'dentist' };
const mockPatient = {
  id: patientId,
  clinic_id: clinicId,
  branch_id: branchId,
  first_name: 'Rajesh',
  last_name: 'Kumar',
  phone: '+919876543210',
  gender: 'male',
  date_of_birth: new Date('1990-05-15'),
  created_at: new Date(),
  updated_at: new Date(),
  branch: mockBranch,
};
const mockAppointment = {
  id: appointmentId,
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  dentist_id: dentistId,
  appointment_date: new Date('2026-03-10'),
  start_time: '10:00',
  end_time: '10:30',
  status: 'scheduled',
  notes: 'Tooth pain in lower molar',
  created_at: new Date(),
  updated_at: new Date(),
  patient: mockPatient,
  dentist: mockDentist,
  branch: mockBranch,
};
const mockTreatment = {
  id: treatmentId,
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  dentist_id: dentistId,
  diagnosis: 'Dental caries - lower right second molar',
  procedure: 'Composite filling',
  tooth_number: 47,
  status: 'completed',
  cost: new Prisma.Decimal(2500),
  notes: 'Class II composite restoration',
  created_at: new Date(),
  updated_at: new Date(),
  patient: mockPatient,
  dentist: mockDentist,
  branch: mockBranch,
};
const mockInvoice = {
  id: invoiceId,
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  invoice_number: 'INV-20260310-0001',
  total_amount: new Prisma.Decimal(2500),
  tax_amount: new Prisma.Decimal(0),
  discount_amount: new Prisma.Decimal(0),
  net_amount: new Prisma.Decimal(2500),
  gst_number: null,
  tax_breakdown: null,
  status: 'pending',
  created_at: new Date(),
  updated_at: new Date(),
  items: [
    {
      id: 'item-1',
      invoice_id: invoiceId,
      treatment_id: treatmentId,
      description: 'Composite filling - tooth 47',
      quantity: 1,
      unit_price: new Prisma.Decimal(2500),
      total_price: new Prisma.Decimal(2500),
      treatment: mockTreatment,
    },
  ],
  payments: [],
  patient: mockPatient,
  branch: mockBranch,
};
const mockPayment = {
  id: paymentId,
  invoice_id: invoiceId,
  method: 'upi',
  amount: new Prisma.Decimal(2500),
  created_at: new Date(),
};

// ----- Build Mock Prisma -----
function buildMockPrisma() {
  return {
    branch: {
      findUnique: jest.fn().mockResolvedValue(mockBranch),
    },
    patient: {
      create: jest.fn().mockResolvedValue(mockPatient),
      findUnique: jest.fn().mockResolvedValue(mockPatient),
      findMany: jest.fn().mockResolvedValue([mockPatient]),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(mockDentist),
    },
    appointment: {
      create: jest.fn().mockResolvedValue(mockAppointment),
      findUnique: jest.fn().mockResolvedValue(mockAppointment),
      findMany: jest.fn().mockResolvedValue([mockAppointment]),
      findFirst: jest.fn().mockResolvedValue(null), // no conflicts
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn(),
      delete: jest.fn(),
    },
    treatment: {
      create: jest.fn().mockResolvedValue(mockTreatment),
      findUnique: jest.fn().mockResolvedValue(mockTreatment),
      findMany: jest.fn().mockResolvedValue([mockTreatment]),
      update: jest.fn(),
    },
    invoice: {
      create: jest.fn().mockResolvedValue(mockInvoice),
      findUnique: jest.fn().mockResolvedValue(mockInvoice),
      findMany: jest.fn().mockResolvedValue([mockInvoice]),
      findFirst: jest.fn().mockResolvedValue(null), // no last invoice
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn().mockResolvedValue(mockPayment),
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
    },
    $transaction: jest.fn().mockImplementation((fn: (tx: any) => Promise<any>) => {
      // Pass the mock prisma itself as the transaction client
      return fn({
        invoice: {
          create: jest.fn().mockResolvedValue(mockInvoice),
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        payment: {
          create: jest.fn().mockResolvedValue(mockPayment),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        },
      });
    }),
  };
}

describe('Integration: Patient → Appointment → Treatment → Invoice → Payment', () => {
  let patientService: PatientService;
  let appointmentService: AppointmentService;
  let treatmentService: TreatmentService;
  let invoiceService: InvoiceService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        AppointmentService,
        TreatmentService,
        InvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    patientService = module.get<PatientService>(PatientService);
    appointmentService = module.get<AppointmentService>(AppointmentService);
    treatmentService = module.get<TreatmentService>(TreatmentService);
    invoiceService = module.get<InvoiceService>(InvoiceService);
  });

  it('should complete the full dental workflow: register → book → treat → bill → pay', async () => {
    // Step 1: Register patient
    const patient = await patientService.create(clinicId, {
      branch_id: branchId,
      first_name: 'Rajesh',
      last_name: 'Kumar',
      phone: '+919876543210',
      gender: 'male',
      date_of_birth: '1990-05-15',
    });
    expect(patient.id).toBe(patientId);
    expect(patient.clinic_id).toBe(clinicId);
    expect(mockPrisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clinic_id: clinicId, first_name: 'Rajesh' }),
      }),
    );

    // Step 2: Book appointment
    const appointment = await appointmentService.create(clinicId, {
      branch_id: branchId,
      patient_id: patientId,
      dentist_id: dentistId,
      appointment_date: '2026-03-10',
      start_time: '10:00',
      end_time: '10:30',
      notes: 'Tooth pain in lower molar',
    });
    expect(appointment.id).toBe(appointmentId);
    expect(appointment.patient_id).toBe(patientId);
    expect(appointment.dentist_id).toBe(dentistId);

    // Step 3: Record treatment after examination
    const treatment = await treatmentService.create(clinicId, {
      branch_id: branchId,
      patient_id: patientId,
      dentist_id: dentistId,
      diagnosis: 'Dental caries - lower right second molar',
      procedure: 'Composite filling',
      tooth_number: 47,
      cost: 2500,
      status: 'completed',
      notes: 'Class II composite restoration',
    });
    expect(treatment.id).toBe(treatmentId);
    expect(Number(treatment.cost)).toBe(2500);
    expect(treatment.tooth_number).toBe(47);

    // Step 4: Generate invoice with treatment line item
    const invoice = await invoiceService.create(clinicId, {
      branch_id: branchId,
      patient_id: patientId,
      items: [
        {
          treatment_id: treatmentId,
          description: 'Composite filling - tooth 47',
          quantity: 1,
          unit_price: 2500,
        },
      ],
    });
    expect(invoice.invoice_number).toMatch(/^INV-\d{8}-\d{4}$/);
    expect(invoice.status).toBe('pending');

    // Step 5: Record UPI payment (common in India)
    const payment = await invoiceService.addPayment(clinicId, {
      invoice_id: invoiceId,
      method: 'upi',
      amount: 2500,
    });
    expect(payment.method).toBe('upi');
    expect(Number(payment.amount)).toBe(2500);
  });

  it('should reject appointment if start_time >= end_time', async () => {
    await expect(
      appointmentService.create(clinicId, {
        branch_id: branchId,
        patient_id: patientId,
        dentist_id: dentistId,
        appointment_date: '2026-03-10',
        start_time: '10:30',
        end_time: '10:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject overpayment on invoice', async () => {
    // Mock: invoice with net_amount = 2500, already paid 2500
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        payment: {
          create: jest.fn(),
          aggregate: jest.fn().mockResolvedValue({ _sum: { amount: new Prisma.Decimal(2500) } }),
        },
        invoice: { update: jest.fn() },
      });
    });
    // Invoice is already paid
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({ ...mockInvoice, status: 'paid' });

    await expect(
      invoiceService.addPayment(clinicId, {
        invoice_id: invoiceId,
        method: 'cash',
        amount: 100,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should validate treatment IDs belong to clinic when creating invoice', async () => {
    // Treatment not found in clinic
    mockPrisma.treatment.findMany.mockResolvedValueOnce([]);

    await expect(
      invoiceService.create(clinicId, {
        branch_id: branchId,
        patient_id: patientId,
        items: [
          {
            treatment_id: 'non-existent-treatment',
            description: 'Fake treatment',
            quantity: 1,
            unit_price: 1000,
          },
        ],
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('Integration: Clinic Isolation (Multi-Tenant Security)', () => {
  let patientService: PatientService;
  let appointmentService: AppointmentService;
  let treatmentService: TreatmentService;
  let invoiceService: InvoiceService;
  let mockPrisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    mockPrisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        AppointmentService,
        TreatmentService,
        InvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    patientService = module.get<PatientService>(PatientService);
    appointmentService = module.get<AppointmentService>(AppointmentService);
    treatmentService = module.get<TreatmentService>(TreatmentService);
    invoiceService = module.get<InvoiceService>(InvoiceService);
  });

  it('should prevent creating a patient with a branch from another clinic', async () => {
    mockPrisma.branch.findUnique.mockResolvedValueOnce(mockBranchB);

    await expect(
      patientService.create(clinicId, {
        branch_id: branchIdB,
        first_name: 'Test',
        last_name: 'User',
        phone: '+911234567890',
        gender: 'male',
        date_of_birth: '2000-01-01',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should prevent reading a patient from another clinic', async () => {
    mockPrisma.patient.findUnique.mockResolvedValueOnce({
      ...mockPatient,
      clinic_id: clinicIdB,
    });

    await expect(patientService.findOne(clinicId, patientId)).rejects.toThrow(NotFoundException);
  });

  it('should prevent booking appointment with a dentist from another clinic', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      ...mockDentist,
      clinic_id: clinicIdB,
    });

    await expect(
      appointmentService.create(clinicId, {
        branch_id: branchId,
        patient_id: patientId,
        dentist_id: dentistId,
        appointment_date: '2026-03-10',
        start_time: '10:00',
        end_time: '10:30',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should prevent booking appointment with a patient from another clinic', async () => {
    mockPrisma.patient.findUnique.mockResolvedValueOnce({
      ...mockPatient,
      clinic_id: clinicIdB,
    });

    await expect(
      appointmentService.create(clinicId, {
        branch_id: branchId,
        patient_id: patientId,
        dentist_id: dentistId,
        appointment_date: '2026-03-10',
        start_time: '10:00',
        end_time: '10:30',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should prevent creating treatment for patient in another clinic', async () => {
    mockPrisma.patient.findUnique.mockResolvedValueOnce({
      ...mockPatient,
      clinic_id: clinicIdB,
    });

    await expect(
      treatmentService.create(clinicId, {
        branch_id: branchId,
        patient_id: patientId,
        dentist_id: dentistId,
        diagnosis: 'Test',
        procedure: 'Test',
        cost: 1000,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should prevent accessing an invoice from another clinic', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({
      ...mockInvoice,
      clinic_id: clinicIdB,
    });

    await expect(invoiceService.findOne(clinicId, invoiceId)).rejects.toThrow(NotFoundException);
  });

  it('should prevent creating invoice with branch from another clinic', async () => {
    mockPrisma.branch.findUnique.mockResolvedValueOnce(mockBranchB);

    await expect(
      invoiceService.create(clinicId, {
        branch_id: branchIdB,
        patient_id: patientId,
        items: [{ description: 'Consultation', quantity: 1, unit_price: 500 }],
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should prevent adding payment to another clinic invoice', async () => {
    mockPrisma.invoice.findUnique.mockResolvedValueOnce({
      ...mockInvoice,
      clinic_id: clinicIdB,
    });

    await expect(
      invoiceService.addPayment(clinicId, {
        invoice_id: invoiceId,
        method: 'cash',
        amount: 500,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should scope patient listing to the correct clinic', async () => {
    await patientService.findAll(clinicId, {});
    expect(mockPrisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinic_id: clinicId }),
      }),
    );
  });

  it('should scope appointment listing to the correct clinic', async () => {
    await appointmentService.findAll(clinicId, {});
    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clinic_id: clinicId }),
      }),
    );
  });
});
