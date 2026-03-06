import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { FeatureService } from './feature.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const mockFeature = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  key: 'AI_PRESCRIPTION',
  description: 'AI-powered prescription generation',
  created_at: new Date(),
};

const mockPrismaService = {
  feature: {
    create: jest.fn().mockResolvedValue(mockFeature),
    findMany: jest.fn().mockResolvedValue([mockFeature]),
    findUnique: jest.fn().mockResolvedValue(null),
  },
};

describe('FeatureService', () => {
  let service: FeatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FeatureService>(FeatureService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a feature', async () => {
      mockPrismaService.feature.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.feature.create.mockResolvedValueOnce(mockFeature);
      const result = await service.create({
        key: 'AI_PRESCRIPTION',
        description: 'AI-powered prescription generation',
      });
      expect(result).toEqual(mockFeature);
      expect(mockPrismaService.feature.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when feature key already exists', async () => {
      mockPrismaService.feature.findUnique.mockResolvedValueOnce(mockFeature);
      await expect(
        service.create({
          key: 'AI_PRESCRIPTION',
          description: 'Duplicate feature',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return an array of features', async () => {
      mockPrismaService.feature.findMany.mockResolvedValueOnce([mockFeature]);
      const result = await service.findAll();
      expect(result).toEqual([mockFeature]);
    });
  });
});
