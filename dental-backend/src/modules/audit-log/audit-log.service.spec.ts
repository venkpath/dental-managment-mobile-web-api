import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const userId = 'ddd44444-eeee-ffff-0000-111111111111';
const entityId = 'bbb22222-cccc-dddd-eeee-ffffffffffff';

const mockAuditLog = {
  id: 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee',
  clinic_id: clinicId,
  user_id: userId,
  action: 'create',
  entity: 'patients',
  entity_id: entityId,
  metadata: null,
  created_at: new Date(),
};

const mockPrismaService = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    jest.clearAllMocks();
    mockPrismaService.auditLog.create.mockResolvedValue(mockAuditLog);
    mockPrismaService.auditLog.findMany.mockResolvedValue([mockAuditLog]);
    mockPrismaService.auditLog.count.mockResolvedValue(1);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      const result = await service.log({
        clinic_id: clinicId,
        user_id: userId,
        action: 'create',
        entity: 'patients',
        entity_id: entityId,
      });
      expect(result).toEqual(mockAuditLog);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clinic_id: clinicId,
          user_id: userId,
          action: 'create',
          entity: 'patients',
          entity_id: entityId,
        }),
      });
    });

    it('should create audit log with metadata', async () => {
      const metadata = { old_name: 'John', new_name: 'Jane' };
      await service.log({
        clinic_id: clinicId,
        action: 'update',
        entity: 'patients',
        entity_id: entityId,
        metadata,
      });
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata,
          user_id: null,
        }),
      });
    });

    it('should set user_id to null when not provided', async () => {
      await service.log({
        clinic_id: clinicId,
        action: 'delete',
        entity: 'patients',
        entity_id: entityId,
      });
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ user_id: null }),
      });
    });
  });

  describe('findByClinic', () => {
    it('should return audit logs filtered by clinicId with pagination', async () => {
      const result = await service.findByClinic(clinicId, {});
      expect(result).toEqual({
        data: [mockAuditLog],
        meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
      });
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinic_id: clinicId },
          orderBy: { created_at: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(mockPrismaService.auditLog.count).toHaveBeenCalled();
    });

    it('should filter by entity when provided', async () => {
      await service.findByClinic(clinicId, { entity: 'patients' });
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entity: 'patients' }),
        }),
      );
    });

    it('should filter by entity_id when provided', async () => {
      await service.findByClinic(clinicId, { entity_id: entityId });
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entity_id: entityId }),
        }),
      );
    });

    it('should filter by action when provided', async () => {
      await service.findByClinic(clinicId, { action: 'create' });
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'create' }),
        }),
      );
    });

    it('should filter by user_id when provided', async () => {
      await service.findByClinic(clinicId, { user_id: userId });
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ user_id: userId }),
        }),
      );
    });
  });
});
