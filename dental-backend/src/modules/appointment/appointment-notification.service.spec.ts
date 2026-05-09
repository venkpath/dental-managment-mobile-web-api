import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentNotificationService } from './appointment-notification.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { AutomationService } from '../automation/automation.service.js';

const clinicId = 'clinic-uuid-0001';
const appointmentId = 'appt-uuid-0001';
const patientId = 'patient-uuid-0001';

const mockAppointment = {
  id: appointmentId,
  clinic_id: clinicId,
  patient_id: patientId,
  dentist_id: 'dentist-1',
  appointment_date: new Date('2026-06-01'),
  start_time: '09:00',
  end_time: '09:30',
  status: 'scheduled',
  notes: 'Root Canal',
  patient: { id: patientId, first_name: 'John', last_name: 'Doe', phone: '9999999999' },
  dentist: { name: 'Dr. Priya', phone: '8888888888', role: 'dentist' },
  branch: { name: 'Main Branch', address: '123 St', map_url: null, latitude: null, longitude: null, book_now_url: null },
  clinic: { id: clinicId, name: 'Test Clinic', phone: '7777777777' },
};

const mockPrisma = {
  appointment: { findUnique: jest.fn() },
  messageTemplate: { findFirst: jest.fn(), findUnique: jest.fn() },
  planFeature: { findFirst: jest.fn() },
};

const mockCommunicationService = {
  sendMessage: jest.fn(),
  sendStaffWhatsAppTemplate: jest.fn(),
};

const mockAutomationService = {
  getRuleConfig: jest.fn(),
  isRuleEnabled: jest.fn(),
};

describe('AppointmentNotificationService', () => {
  let service: AppointmentNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentNotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommunicationService, useValue: mockCommunicationService },
        { provide: AutomationService, useValue: mockAutomationService },
      ],
    }).compile();

    service = module.get<AppointmentNotificationService>(AppointmentNotificationService);
    jest.clearAllMocks();

    mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
    mockPrisma.messageTemplate.findFirst.mockResolvedValue({ id: 'tpl-1', template_name: 'dental_appointment_confirmation' });
    mockPrisma.planFeature.findFirst.mockResolvedValue({ id: 'feat-1' }); // feature enabled
    mockAutomationService.getRuleConfig.mockResolvedValue({ is_enabled: true, template_id: null });
    mockCommunicationService.sendMessage.mockResolvedValue({ status: 'queued' });
    mockCommunicationService.sendStaffWhatsAppTemplate.mockResolvedValue({ status: 'queued' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── sendConfirmation ────────────────────────────────────────

  describe('sendConfirmation', () => {
    it('should send confirmation notification via communication service', async () => {
      await service.sendConfirmation(clinicId, appointmentId);
      expect(mockCommunicationService.sendMessage).toHaveBeenCalledWith(
        clinicId,
        expect.objectContaining({ patient_id: patientId }),
      );
    });

    it('should skip when clinic does not have APPOINTMENT_CONFIRMATIONS feature', async () => {
      mockPrisma.planFeature.findFirst.mockResolvedValueOnce(null);
      await service.sendConfirmation(clinicId, appointmentId);
      expect(mockCommunicationService.sendMessage).not.toHaveBeenCalled();
    });

    it('should skip when automation rule is disabled', async () => {
      mockAutomationService.getRuleConfig.mockResolvedValueOnce({ is_enabled: false, template_id: null });
      await service.sendConfirmation(clinicId, appointmentId);
      expect(mockCommunicationService.sendMessage).not.toHaveBeenCalled();
    });

    it('should not throw when appointment not found — logs and returns', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValueOnce(null);
      await expect(service.sendConfirmation(clinicId, appointmentId)).resolves.not.toThrow();
      expect(mockCommunicationService.sendMessage).not.toHaveBeenCalled();
    });

    it('should not throw on communication failure — swallows errors', async () => {
      mockCommunicationService.sendMessage.mockRejectedValueOnce(new Error('Network error'));
      await expect(service.sendConfirmation(clinicId, appointmentId)).resolves.not.toThrow();
    });
  });

  // ─── sendCancellation ────────────────────────────────────────

  describe('sendCancellation', () => {
    it('should send cancellation notification', async () => {
      await service.sendCancellation(clinicId, appointmentId);
      expect(mockCommunicationService.sendMessage).toHaveBeenCalled();
    });

    it('should not throw on failure', async () => {
      mockCommunicationService.sendMessage.mockRejectedValueOnce(new Error('fail'));
      await expect(service.sendCancellation(clinicId, appointmentId)).resolves.not.toThrow();
    });
  });

  // ─── sendReschedule ──────────────────────────────────────────

  describe('sendReschedule', () => {
    it('should send reschedule notification with old date/time', async () => {
      await service.sendReschedule(clinicId, appointmentId, '2026-05-01', '10:00');
      expect(mockCommunicationService.sendMessage).toHaveBeenCalled();
    });
  });

  // ─── sendDentistConfirmation ──────────────────────────────────

  describe('sendDentistConfirmation', () => {
    it('should send dentist confirmation to dentist phone', async () => {
      await service.sendDentistConfirmation(clinicId, appointmentId);
      expect(mockCommunicationService.sendStaffWhatsAppTemplate).toHaveBeenCalledWith(
        clinicId,
        '8888888888',
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should skip when dentist has no phone', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValueOnce({
        ...mockAppointment,
        dentist: { name: 'Dr. Smith', phone: null, role: 'dentist' },
      });
      await service.sendDentistConfirmation(clinicId, appointmentId);
      expect(mockCommunicationService.sendStaffWhatsAppTemplate).not.toHaveBeenCalled();
    });

    it('should skip when rule is disabled', async () => {
      mockAutomationService.getRuleConfig.mockResolvedValueOnce({ is_enabled: false, template_id: null });
      await service.sendDentistConfirmation(clinicId, appointmentId);
      expect(mockCommunicationService.sendStaffWhatsAppTemplate).not.toHaveBeenCalled();
    });
  });

  // ─── sendDentistReminder ──────────────────────────────────────

  describe('sendDentistReminder', () => {
    it('should send dentist reminder with hours-until context', async () => {
      await service.sendDentistReminder(clinicId, appointmentId, 2);
      expect(mockCommunicationService.sendStaffWhatsAppTemplate).toHaveBeenCalled();
    });

    it('should skip for non-clinical role (e.g. receptionist)', async () => {
      mockPrisma.appointment.findUnique.mockResolvedValueOnce({
        ...mockAppointment,
        dentist: { name: 'Rina', phone: '8888888888', role: 'receptionist' },
      });
      await service.sendDentistReminder(clinicId, appointmentId, 2);
      expect(mockCommunicationService.sendStaffWhatsAppTemplate).not.toHaveBeenCalled();
    });

    it('should not throw on communication failure', async () => {
      mockCommunicationService.sendStaffWhatsAppTemplate.mockRejectedValueOnce(new Error('fail'));
      await expect(service.sendDentistReminder(clinicId, appointmentId, 24)).resolves.not.toThrow();
    });
  });
});
