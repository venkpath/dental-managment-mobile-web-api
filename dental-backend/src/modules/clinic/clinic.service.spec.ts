import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClinicService } from './clinic.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const mockClinic = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Clinic',
  email: 'test@clinic.com',
  phone: '+1-555-000-0000',
  address: '123 Test St',
  city: 'TestCity',
  state: 'TS',
  country: 'US',
  created_at: new Date(),
  updated_at: new Date(),
};

const mockPrismaService = {
  clinic: {
    create: jest.fn().mockResolvedValue(mockClinic),
    findMany: jest.fn().mockResolvedValue([mockClinic]),
    findUnique: jest.fn().mockResolvedValue(mockClinic),
    update: jest.fn().mockResolvedValue({ ...mockClinic, name: 'Updated Clinic' }),
  },
};

describe('ClinicService', () => {
  let service: ClinicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ClinicService>(ClinicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a clinic', async () => {
      const result = await service.create({
        name: 'Test Clinic',
        email: 'test@clinic.com',
      });
      expect(result).toEqual(mockClinic);
      expect(mockPrismaService.clinic.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of clinics', async () => {
      const result = await service.findAll();
      expect(result).toEqual([mockClinic]);
    });
  });

  describe('findOne', () => {
    it('should return a clinic by id', async () => {
      const result = await service.findOne(mockClinic.id);
      expect(result).toEqual(mockClinic);
    });

    it('should throw NotFoundException when clinic not found', async () => {
      mockPrismaService.clinic.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a clinic', async () => {
      const result = await service.update(mockClinic.id, { name: 'Updated Clinic' });
      expect(result.name).toBe('Updated Clinic');
    });
  });
});
