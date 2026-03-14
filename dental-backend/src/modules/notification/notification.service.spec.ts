import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { PrismaService } from '../../database/prisma.service.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const userId = 'ddd44444-eeee-ffff-0000-111111111111';

const mockNotification = {
  id: 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee',
  clinic_id: clinicId,
  user_id: userId,
  type: 'appointment_reminder',
  title: 'Appointment Tomorrow',
  body: 'You have an appointment tomorrow at 10:00',
  is_read: false,
  metadata: null,
  created_at: new Date(),
};

const mockPrismaService = {
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      const result = await service.create({
        clinic_id: clinicId,
        user_id: userId,
        type: 'appointment_reminder',
        title: 'Appointment Tomorrow',
        body: 'You have an appointment tomorrow at 10:00',
      });
      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ clinic_id: clinicId, user_id: userId }),
      });
    });
  });

  describe('createMany', () => {
    it('should create multiple notifications', async () => {
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });
      const result = await service.createMany([
        { clinic_id: clinicId, user_id: userId, type: 'test', title: 'T1', body: 'B1' },
        { clinic_id: clinicId, user_id: userId, type: 'test', title: 'T2', body: 'B2' },
      ]);
      expect(result).toBe(2);
    });
  });

  describe('findByClinicAndUser', () => {
    it('should return paginated notifications', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrismaService.notification.count.mockResolvedValue(1);
      const result = await service.findByClinicAndUser(clinicId, userId, {});
      expect(result.data).toEqual([mockNotification]);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by type and is_read', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(0);
      await service.findByClinicAndUser(clinicId, userId, {
        type: 'appointment_reminder',
        is_read: false,
      });
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'appointment_reminder',
            is_read: false,
          }),
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);
      const result = await service.getUnreadCount(clinicId, userId);
      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const readNotification = { ...mockNotification, is_read: true };
      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue(readNotification);
      const result = await service.markAsRead(clinicId, mockNotification.id);
      expect(result.is_read).toBe(true);
    });

    it('should throw NotFoundException for non-existent notification', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);
      await expect(service.markAsRead(clinicId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for wrong clinic', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        clinic_id: 'other-clinic',
      });
      await expect(service.markAsRead(clinicId, mockNotification.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read and return count', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });
      const result = await service.markAllAsRead(clinicId, userId);
      expect(result).toBe(3);
    });
  });
});
