import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AppointmentService } from './appointment.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AppointmentNotificationService } from './appointment-notification.service.js';
import { AppointmentReminderProducer } from './appointment-reminder.producer.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';
import { AppointmentStatus } from './dto/index.js';

const clinicId = '123e4567-e89b-12d3-a456-426614174000';
const branchId = 'aaa11111-bbbb-cccc-dddd-eeeeeeeeeeee';
const patientId = 'bbb22222-cccc-dddd-eeee-ffffffffffff';
const dentistId = 'ccc33333-dddd-eeee-ffff-aaaaaaaaaaaa';
const otherClinicId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// Use a date 14 days from now so it's always within the 30-day advance booking window
const futureApptDate = new Date();
futureApptDate.setDate(futureApptDate.getDate() + 14);
const futureDateStr = futureApptDate.toISOString().split('T')[0];

const mockAppointment = {
  id: 'ddd44444-eeee-ffff-aaaa-bbbbbbbbbbbb',
  clinic_id: clinicId,
  branch_id: branchId,
  patient_id: patientId,
  dentist_id: dentistId,
  appointment_date: futureApptDate,
  start_time: '09:00',
  end_time: '09:30',
  status: 'scheduled',
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
  appointment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

const mockNotificationService = {
  sendConfirmation: jest.fn().mockResolvedValue(undefined),
  sendCancellation: jest.fn().mockResolvedValue(undefined),
  sendReschedule: jest.fn().mockResolvedValue(undefined),
  sendDentistConfirmation: jest.fn().mockResolvedValue(undefined),
  sendDentistReminder: jest.fn().mockResolvedValue(undefined),
};
const mockReminderProducer = {
  scheduleReminders: jest.fn().mockResolvedValue(undefined),
  cancelReminders: jest.fn().mockResolvedValue(undefined),
  rescheduleReminders: jest.fn().mockResolvedValue(undefined),
};
const mockPlanLimit = { enforceMonthlyCap: jest.fn().mockResolvedValue(undefined) };

describe('AppointmentService', () => {
  let service: AppointmentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AppointmentNotificationService, useValue: mockNotificationService },
        { provide: AppointmentReminderProducer, useValue: mockReminderProducer },
        { provide: PlanLimitService, useValue: mockPlanLimit },
      ],
    }).compile();

    service = module.get<AppointmentService>(AppointmentService);
    jest.clearAllMocks();

    mockPrismaService.branch.findUnique.mockResolvedValue({ id: branchId, clinic_id: clinicId });
    mockPrismaService.patient.findUnique.mockResolvedValue({ id: patientId, clinic_id: clinicId });
    mockPrismaService.user.findUnique.mockResolvedValue({ id: dentistId, clinic_id: clinicId });
    mockPrismaService.appointment.findUnique.mockResolvedValue(mockAppointment);
    mockPrismaService.appointment.findMany.mockResolvedValue([mockAppointment]);
    mockPrismaService.appointment.count.mockResolvedValue(1);
    mockPrismaService.appointment.findFirst.mockResolvedValue(null);
    mockPrismaService.appointment.create.mockResolvedValue(mockAppointment);
    mockPrismaService.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'completed' });
    mockPrismaService.appointment.delete.mockResolvedValue(mockAppointment);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      branch_id: branchId,
      patient_id: patientId,
      dentist_id: dentistId,
      appointment_date: futureDateStr,
      start_time: '09:00',
      end_time: '09:30',
    };

    it('should create an appointment with clinic scoping', async () => {
      const result = await service.create(clinicId, createDto);
      expect(result).toEqual(mockAppointment);
      expect(mockPrismaService.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ clinic_id: clinicId, dentist_id: dentistId }),
        include: { patient: true, dentist: true, branch: true },
      });
    });

    it('should throw BadRequestException if start_time >= end_time', async () => {
      await expect(
        service.create(clinicId, { ...createDto, start_time: '10:00', end_time: '09:00' }),
      ).rejects.toThrow(BadRequestException);
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

    it('should throw ConflictException on time slot overlap', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValueOnce({
        ...mockAppointment,
        start_time: '08:45',
        end_time: '09:15',
      });
      await expect(service.create(clinicId, createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return appointments filtered by clinicId with pagination', async () => {
      const result = await service.findAll(clinicId, {});
      expect(result).toEqual({
        data: [mockAppointment],
        meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
      });
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinic_id: clinicId },
          skip: 0,
          take: 20,
        }),
      );
      expect(mockPrismaService.appointment.count).toHaveBeenCalled();
    });

    it('should filter by date', async () => {
      await service.findAll(clinicId, { date: '2026-03-15' });
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            appointment_date: new Date('2026-03-15'),
          }),
        }),
      );
    });

    it('should filter by dentist_id', async () => {
      await service.findAll(clinicId, { dentist_id: dentistId });
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dentist_id: dentistId }),
        }),
      );
    });

    it('should filter by branch_id', async () => {
      await service.findAll(clinicId, { branch_id: branchId });
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ branch_id: branchId }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an appointment belonging to the clinic', async () => {
      const result = await service.findOne(clinicId, mockAppointment.id);
      expect(result).toEqual(mockAppointment);
    });

    it('should throw NotFoundException when appointment not found', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne(clinicId, 'non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when appointment belongs to different clinic', async () => {
      await expect(service.findOne(otherClinicId, mockAppointment.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update appointment status', async () => {
      const result = await service.update(clinicId, mockAppointment.id, { status: AppointmentStatus.COMPLETED });
      expect(result.status).toBe('completed');
    });

    it('should check conflict when rescheduling time', async () => {
      await service.update(clinicId, mockAppointment.id, { start_time: '10:00', end_time: '10:30' });
      expect(mockPrismaService.appointment.findFirst).toHaveBeenCalled();
    });

    it('should throw ConflictException when rescheduling causes overlap', async () => {
      mockPrismaService.appointment.findFirst.mockResolvedValueOnce({
        ...mockAppointment,
        id: 'other-appointment-id',
        start_time: '09:45',
        end_time: '10:15',
      });
      await expect(
        service.update(clinicId, mockAppointment.id, { start_time: '10:00', end_time: '10:30' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when updating from different clinic', async () => {
      await expect(
        service.update(otherClinicId, mockAppointment.id, { notes: 'hack' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate dentist belongs to clinic when changing dentist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: 'new-dentist', clinic_id: otherClinicId });
      await expect(
        service.update(clinicId, mockAppointment.id, { dentist_id: 'new-dentist' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an appointment within the same clinic', async () => {
      const result = await service.remove(clinicId, mockAppointment.id);
      expect(result).toEqual(mockAppointment);
      expect(mockPrismaService.appointment.delete).toHaveBeenCalledWith({
        where: { id: mockAppointment.id },
      });
    });

    it('should throw NotFoundException when deleting from different clinic', async () => {
      await expect(
        service.remove(otherClinicId, mockAppointment.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
