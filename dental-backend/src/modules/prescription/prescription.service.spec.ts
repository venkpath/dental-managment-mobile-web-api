import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrescriptionService } from './prescription.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PrescriptionPdfService } from './prescription-pdf.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';
const patientId = 'bbb22222-cccc-dddd-eeee-ffffffffffff';
const dentistId = 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const mockPrescription = {
  id: 'fff66666-aaaa-bbbb-cccc-dddddddddddd',
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  dentist_id: dentistId,
  diagnosis: 'Post-extraction infection',
  instructions: 'Avoid hot food for 24 hours',
  created_at: new Date(),
  items: [
    {
      id: 'item-1111',
      prescription_id: 'fff66666-aaaa-bbbb-cccc-dddddddddddd',
      medicine_name: 'Amoxicillin 500mg',
      dosage: '500mg',
      frequency: 'Three times a day',
      duration: '5 days',
      notes: null,
    },
  ],
  patient: { id: patientId, first_name: 'John', last_name: 'Doe' },
  dentist: { id: dentistId, name: 'Dr. Smith' },
  branch: { id: branchId, name: 'Main Branch' },
};

const mockPrismaService = {
  branch: { findUnique: jest.fn() },
  patient: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  prescription: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockPdfService = { generate: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
const mockS3Service = { upload: jest.fn().mockResolvedValue('s3://key'), getSignedUrl: jest.fn().mockResolvedValue('https://url') };
const mockCommunicationService = { sendMessage: jest.fn().mockResolvedValue({}) };
const mockAutomationService = { getRuleConfig: jest.fn().mockResolvedValue({ is_enabled: false }) };
const mockPlanLimit = { enforceMonthlyCap: jest.fn().mockResolvedValue(undefined) };

describe('PrescriptionService', () => {
  let service: PrescriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PrescriptionPdfService, useValue: mockPdfService },
        { provide: S3Service, useValue: mockS3Service },
        { provide: CommunicationService, useValue: mockCommunicationService },
        { provide: AutomationService, useValue: mockAutomationService },
        { provide: PlanLimitService, useValue: mockPlanLimit },
      ],
    }).compile();

    service = module.get<PrescriptionService>(PrescriptionService);
    jest.clearAllMocks();

    mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: patientId, clinic_id: clinicId });
    mockPrismaService.user.findUnique.mockResolvedValue({ id: dentistId, clinic_id: clinicId });
    mockPrismaService.prescription.findUnique.mockResolvedValue(mockPrescription);
    mockPrismaService.prescription.findMany.mockResolvedValue([mockPrescription]);
    mockPrismaService.prescription.create.mockResolvedValue(mockPrescription);
    mockPrismaService.$transaction.mockImplementation((fn: (tx: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      branch_id: branchId,
      patient_id: patientId,
      dentist_id: dentistId,
      diagnosis: 'Post-extraction infection',
      instructions: 'Avoid hot food for 24 hours',
      items: [
        {
          medicine_name: 'Amoxicillin 500mg',
          dosage: '500mg',
          frequency: 'Three times a day',
          duration: '5 days',
        },
      ],
    };

    it('should create a prescription with items', async () => {
      const result = await service.create(clinicId, createDto);
      expect(result).toEqual(mockPrescription);
      expect(mockPrismaService.prescription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinic_id: clinicId,
          diagnosis: 'Post-extraction infection',
          items: { create: createDto.items },
        }),
        include: expect.objectContaining({ items: true }),
      });
    });

    it('should throw NotFoundException if branch not in clinic', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: otherClinicId });
      await expect(service.create(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if patient not in clinic', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({ id: patientId, clinic_id: otherClinicId });
      await expect(service.create(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if dentist not in clinic', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: dentistId, clinic_id: otherClinicId });
      await expect(service.create(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a prescription with items', async () => {
      const result = await service.findOne(clinicId, mockPrescription.id);
      expect(result).toEqual(mockPrescription);
      expect((result as typeof mockPrescription).items).toHaveLength(1);
    });

    it('should throw NotFoundException when prescription not found', async () => {
      mockPrismaService.prescription.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when prescription belongs to different clinic', async () => {
      await expect(service.findOne(otherClinicId, mockPrescription.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPatient', () => {
    it('should return prescriptions for a specific patient', async () => {
      const result = await service.findByPatient(clinicId, patientId);
      expect(result).toEqual([mockPrescription]);
      expect(mockPrismaService.prescription.findMany).toHaveBeenCalledWith({
        where: { clinic_id: clinicId, patient_id: patientId },
        orderBy: { created_at: 'desc' },
        include: expect.objectContaining({ items: true }),
      });
    });

    it('should throw NotFoundException if patient not in clinic', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({ id: patientId, clinic_id: otherClinicId });
      await expect(service.findByPatient(clinicId, patientId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if patient not found', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce(null);
      await expect(service.findByPatient(clinicId, 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
