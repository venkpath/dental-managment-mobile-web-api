import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PatientService } from './patient.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { ConfigService } from '@nestjs/config';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { Gender } from './dto/index.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const mockPatient = {
  id: 'bbb22222-cccc-dddd-eeee-ffffffffffff',
  clinic_id: clinicId,
  branch_id: branchId,
  first_name: 'John',
  last_name: 'Doe',
  phone: '+91-9876543210',
  email: 'john@example.com',
  gender: 'Male',
  date_of_birth: new Date('1990-05-15'),
  blood_group: 'O+',
  medical_history: {},
  allergies: null,
  notes: null,
  created_at: new Date(),
  updated_at: new Date(),
  branch: { id: branchId, name: 'Main Branch' },
};

const mockPrismaService = {
  branch: {
    findUnique: jest.fn(),
  },
  patient: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

const mockConfig = { get: jest.fn().mockReturnValue('test-key') };
const mockPlanLimit = { enforceMonthlyCap: jest.fn().mockResolvedValue(undefined) };
const mockS3Service = { getSignedUrl: jest.fn().mockResolvedValue('https://signed.url') };

describe('PatientService', () => {
  let service: PatientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PlanLimitService, useValue: mockPlanLimit },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    service = module.get<PatientService>(PatientService);
    jest.clearAllMocks();
    mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrismaService.patient.findUnique.mockResolvedValue(mockPatient);
    mockPrismaService.patient.findMany.mockResolvedValue([mockPatient]);
    mockPrismaService.patient.count.mockResolvedValue(1);
    mockPrismaService.patient.create.mockResolvedValue(mockPatient);
    mockPrismaService.patient.update.mockResolvedValue({ ...mockPatient, first_name: 'Jane' });
    mockPrismaService.patient.delete.mockResolvedValue(mockPatient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      branch_id: branchId,
      first_name: 'John',
      last_name: 'Doe',
      phone: '+91-9876543210',
      gender: Gender.MALE,
      date_of_birth: '1990-05-15',
    };

    it('should create a patient scoped to clinic and branch', async () => {
      const result = await service.create(clinicId, createDto);
      expect(result).toEqual(mockPatient);
      expect(mockPrismaService.branch.findUnique).toHaveBeenCalledWith({
        where: { id: branchId },
      });
      expect(mockPrismaService.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinic_id: clinicId,
          branch_id: branchId,
          first_name: 'John',
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
    it('should return patients filtered by clinicId with pagination', async () => {
      const result = await service.findAll(clinicId, {});
      expect(result).toEqual({
        data: [mockPatient],
        meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
      });
      expect(mockPrismaService.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinic_id: clinicId },
          skip: 0,
          take: 20,
        }),
      );
      expect(mockPrismaService.patient.count).toHaveBeenCalledWith({
        where: { clinic_id: clinicId },
      });
    });

    it('should filter by phone when provided', async () => {
      await service.findAll(clinicId, { phone: '9876' });
      expect(mockPrismaService.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            phone: { contains: '9876', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by name when provided', async () => {
      await service.findAll(clinicId, { name: 'John' });
      expect(mockPrismaService.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { first_name: { contains: 'John', mode: 'insensitive' } },
              { last_name: { contains: 'John', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by branch_id when provided', async () => {
      await service.findAll(clinicId, { branch_id: branchId });
      expect(mockPrismaService.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            branch_id: branchId,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a patient when it belongs to the clinic', async () => {
      const result = await service.findOne(clinicId, mockPatient.id);
      expect(result).toEqual(mockPatient);
    });

    it('should throw NotFoundException when patient not found', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when patient belongs to different clinic', async () => {
      await expect(service.findOne(otherClinicId, mockPatient.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a patient within the same clinic', async () => {
      const result = await service.update(clinicId, mockPatient.id, { first_name: 'Jane' });
      expect(result.first_name).toBe('Jane');
    });

    it('should throw NotFoundException when updating patient from different clinic', async () => {
      await expect(
        service.update(otherClinicId, mockPatient.id, { first_name: 'Hack' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a patient within the same clinic', async () => {
      const result = await service.remove(clinicId, mockPatient.id);
      expect(result).toEqual(mockPatient);
      expect(mockPrismaService.patient.delete).toHaveBeenCalledWith({
        where: { id: mockPatient.id },
      });
    });

    it('should throw NotFoundException when deleting patient from different clinic', async () => {
      await expect(
        service.remove(otherClinicId, mockPatient.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
