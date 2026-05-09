import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TreatmentService } from './treatment.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';
import { TreatmentStatus } from './dto/index.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';
const patientId = 'bbb22222-cccc-dddd-eeee-ffffffffffff';
const dentistId = 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const mockTreatment = {
  id: 'eee55555-ffff-aaaa-bbbb-cccccccccccc',
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  dentist_id: dentistId,
  tooth_number: '14',
  diagnosis: 'Dental caries',
  procedure: 'Composite restoration',
  status: 'planned',
  cost: 2500.0,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
  patient: { id: patientId, first_name: 'John', last_name: 'Doe' },
  dentist: { id: dentistId, name: 'Dr. Smith' },
  branch: { id: branchId, name: 'Main Branch' },
};

const mockPrismaService = {
  branch: { findUnique: jest.fn() },
  patient: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  treatment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
};

const mockPlanLimit = { enforceMonthlyCap: jest.fn().mockResolvedValue(undefined) };

describe('TreatmentService', () => {
  let service: TreatmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PlanLimitService, useValue: mockPlanLimit },
      ],
    }).compile();

    service = module.get<TreatmentService>(TreatmentService);
    jest.clearAllMocks();

    mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: patientId, clinic_id: clinicId });
    mockPrismaService.user.findUnique.mockResolvedValue({ id: dentistId, clinic_id: clinicId });
    mockPrismaService.treatment.findUnique.mockResolvedValue(mockTreatment);
    mockPrismaService.treatment.findMany.mockResolvedValue([mockTreatment]);
    mockPrismaService.treatment.count.mockResolvedValue(1);
    mockPrismaService.treatment.create.mockResolvedValue(mockTreatment);
    mockPrismaService.treatment.update.mockResolvedValue({ ...mockTreatment, status: 'completed' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      branch_id: branchId,
      patient_id: patientId,
      dentist_id: dentistId,
      tooth_number: '14',
      diagnosis: 'Dental caries',
      procedure: 'Composite restoration',
      cost: 2500.0,
    };

    it('should create a treatment scoped to clinic', async () => {
      const result = await service.create(clinicId, createDto);
      expect(result).toEqual(mockTreatment);
      expect(mockPrismaService.treatment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ clinic_id: clinicId, diagnosis: 'Dental caries' }),
        include: { patient: true, dentist: true, branch: true },
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

  describe('findAll', () => {
    it('should return paginated treatments filtered by clinicId', async () => {
      const result = await service.findAll(clinicId, {});
      expect(result).toEqual({
        data: [mockTreatment],
        meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
      });
      expect(mockPrismaService.treatment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clinic_id: clinicId } }),
      );
      expect(mockPrismaService.treatment.count).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      await service.findAll(clinicId, { status: TreatmentStatus.PLANNED });
      expect(mockPrismaService.treatment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'planned' }),
        }),
      );
    });

    it('should filter by dentist_id', async () => {
      await service.findAll(clinicId, { dentist_id: dentistId });
      expect(mockPrismaService.treatment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dentist_id: dentistId }),
        }),
      );
    });

    it('should filter by branch_id', async () => {
      await service.findAll(clinicId, { branch_id: branchId });
      expect(mockPrismaService.treatment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ branch_id: branchId }),
        }),
      );
    });
  });

  describe('findByPatient', () => {
    it('should return treatments for a specific patient', async () => {
      const result = await service.findByPatient(clinicId, patientId);
      expect(result).toEqual([mockTreatment]);
      expect(mockPrismaService.treatment.findMany).toHaveBeenCalledWith({
        where: { clinic_id: clinicId, patient_id: patientId },
        orderBy: { created_at: 'desc' },
        include: { dentist: true, branch: true },
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

  describe('findOne', () => {
    it('should return a treatment belonging to the clinic', async () => {
      const result = await service.findOne(clinicId, mockTreatment.id);
      expect(result).toEqual(mockTreatment);
    });

    it('should throw NotFoundException when treatment not found', async () => {
      mockPrismaService.treatment.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when treatment belongs to different clinic', async () => {
      await expect(service.findOne(otherClinicId, mockTreatment.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update treatment status', async () => {
      const result = await service.update(clinicId, mockTreatment.id, { status: TreatmentStatus.COMPLETED });
      expect(result.status).toBe('completed');
    });

    it('should throw NotFoundException when updating from different clinic', async () => {
      await expect(
        service.update(otherClinicId, mockTreatment.id, { diagnosis: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate dentist belongs to clinic when changing dentist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: 'new-dentist', clinic_id: otherClinicId });
      await expect(
        service.update(clinicId, mockTreatment.id, { dentist_id: 'new-dentist' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
