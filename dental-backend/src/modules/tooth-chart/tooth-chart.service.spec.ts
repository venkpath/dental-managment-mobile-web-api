import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ToothChartService } from './tooth-chart.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';
const patientId = 'bbb22222-cccc-dddd-eeee-ffffffffffff';
const toothId = 'ccc33333-dddd-eeee-ffff-000000000001';
const surfaceId = 'ddd44444-eeee-ffff-0000-000000000001';
const dentistId = 'eee55555-ffff-0000-1111-222222222222';
const conditionId = 'fff66666-0000-1111-2222-333333333333';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const mockTooth = { id: toothId, fdi_number: 11, name: 'Upper Right Central Incisor', quadrant: 1, position: 1 };
const mockSurface = { id: surfaceId, name: 'Mesial', code: 'M' };
const mockDentist = { id: dentistId, name: 'Dr. Smith', email: 'dr@example.com', role: 'dentist' };

const mockCondition = {
  id: conditionId,
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  tooth_id: toothId,
  surface_id: surfaceId,
  condition: 'cavity',
  severity: 'moderate',
  notes: null,
  diagnosed_by: dentistId,
  created_at: new Date(),
  updated_at: new Date(),
  tooth: mockTooth,
  surface: mockSurface,
  dentist: mockDentist,
};

const mockPrismaService = {
  tooth: { findMany: jest.fn(), findUnique: jest.fn() },
  toothSurface: { findMany: jest.fn(), findUnique: jest.fn() },
  patient: { findUnique: jest.fn() },
  branch: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  treatment: { findMany: jest.fn() },
  patientToothCondition: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('ToothChartService', () => {
  let service: ToothChartService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToothChartService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ToothChartService>(ToothChartService);
    jest.clearAllMocks();

    mockPrismaService.tooth.findMany.mockResolvedValue([mockTooth]);
    mockPrismaService.tooth.findUnique.mockResolvedValue(mockTooth);
    mockPrismaService.toothSurface.findMany.mockResolvedValue([mockSurface]);
    mockPrismaService.toothSurface.findUnique.mockResolvedValue(mockSurface);
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: patientId, clinic_id: clinicId });
    mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrismaService.user.findUnique.mockResolvedValue({ id: dentistId, clinic_id: clinicId });
    mockPrismaService.treatment.findMany.mockResolvedValue([]);
    mockPrismaService.patientToothCondition.findMany.mockResolvedValue([mockCondition]);
    mockPrismaService.patientToothCondition.findUnique.mockResolvedValue(mockCondition);
    mockPrismaService.patientToothCondition.create.mockResolvedValue(mockCondition);
    mockPrismaService.patientToothCondition.update.mockResolvedValue({ ...mockCondition, severity: 'severe' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTeeth', () => {
    it('should return all teeth ordered by fdi_number', async () => {
      const result = await service.getTeeth();
      expect(result).toEqual([mockTooth]);
      expect(mockPrismaService.tooth.findMany).toHaveBeenCalledWith({ orderBy: { fdi_number: 'asc' } });
    });
  });

  describe('getSurfaces', () => {
    it('should return all tooth surfaces', async () => {
      const result = await service.getSurfaces();
      expect(result).toEqual([mockSurface]);
    });
  });

  describe('getPatientToothChart', () => {
    it('should return teeth, surfaces, conditions, and treatments for a patient', async () => {
      const result = await service.getPatientToothChart(clinicId, patientId);
      expect(result.teeth).toEqual([mockTooth]);
      expect(result.surfaces).toEqual([mockSurface]);
      expect(result.conditions).toEqual([mockCondition]);
      expect(result.treatments).toEqual([]);
    });

    it('should throw NotFoundException if patient does not belong to clinic', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({ id: patientId, clinic_id: otherClinicId });
      await expect(service.getPatientToothChart(clinicId, patientId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if patient does not exist', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce(null);
      await expect(service.getPatientToothChart(clinicId, patientId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCondition', () => {
    const createDto = {
      branch_id: branchId,
      patient_id: patientId,
      tooth_id: toothId,
      surface_id: surfaceId,
      condition: 'cavity',
      severity: 'moderate',
      diagnosed_by: dentistId,
    };

    it('should create a tooth condition scoped to clinic', async () => {
      const result = await service.createCondition(clinicId, createDto);
      expect(result).toEqual(mockCondition);
      expect(mockPrismaService.patientToothCondition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinic_id: clinicId,
          patient_id: patientId,
          tooth_id: toothId,
          condition: 'cavity',
        }),
        include: expect.objectContaining({ tooth: true, surface: true }),
      });
    });

    it('should throw NotFoundException if branch does not belong to clinic', async () => {
      mockPrismaService.branch.findUnique.mockResolvedValueOnce({ id: branchId, clinic_id: otherClinicId });
      await expect(service.createCondition(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if patient does not belong to clinic', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce({ id: patientId, clinic_id: otherClinicId });
      await expect(service.createCondition(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if tooth does not exist', async () => {
      mockPrismaService.tooth.findUnique.mockResolvedValueOnce(null);
      await expect(service.createCondition(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if surface does not exist', async () => {
      mockPrismaService.toothSurface.findUnique.mockResolvedValueOnce(null);
      await expect(service.createCondition(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if dentist does not belong to clinic', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: dentistId, clinic_id: otherClinicId });
      await expect(service.createCondition(clinicId, createDto)).rejects.toThrow(NotFoundException);
    });

    it('should create condition without surface_id', async () => {
      const dtoNoSurface = { ...createDto, surface_id: undefined };
      await service.createCondition(clinicId, dtoNoSurface);
      expect(mockPrismaService.toothSurface.findUnique).not.toHaveBeenCalled();
      expect(mockPrismaService.patientToothCondition.create).toHaveBeenCalled();
    });
  });

  describe('updateCondition', () => {
    it('should update a tooth condition within the same clinic', async () => {
      const result = await service.updateCondition(clinicId, conditionId, { severity: 'severe' });
      expect(result.severity).toBe('severe');
    });

    it('should throw NotFoundException if condition does not belong to clinic', async () => {
      mockPrismaService.patientToothCondition.findUnique.mockResolvedValueOnce({
        ...mockCondition,
        clinic_id: otherClinicId,
      });
      await expect(
        service.updateCondition(clinicId, conditionId, { severity: 'mild' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if condition does not exist', async () => {
      mockPrismaService.patientToothCondition.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.updateCondition(clinicId, 'non-existent', { severity: 'mild' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate surface_id on update if provided', async () => {
      mockPrismaService.toothSurface.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.updateCondition(clinicId, conditionId, { surface_id: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
